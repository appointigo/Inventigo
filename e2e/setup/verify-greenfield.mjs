import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { assertSafeE2EEnvironment } from "./environment.mjs";

const { Client } = pg;
const root = fileURLToPath(new URL("../..", import.meta.url));
const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const manifest = JSON.parse(
  fs.readFileSync(new URL("../baseline/history-manifest.json", import.meta.url), "utf8"),
);
const requiredConstraints = [
  "whatsapp_template_definitions_scope_owner_check",
  "purchase_items_positive_quantity_check",
  "purchase_items_nonnegative_money_check",
  "purchase_item_options_positive_quantity_check",
  "purchases_nonnegative_money_check",
  "stock_transfers_distinct_stores",
  "stock_transfer_items_positive_requested",
  "stock_transfer_items_nonnegative_quantities",
];
const requiredPartialIndexes = [
  "store_whatsapp_senders_active_default_key",
  "whatsapp_template_definitions_platform_key",
  "whatsapp_template_definitions_organization_key",
];

function verifyPrismaDrift() {
  const result = spawnSync(
    executable,
    [
      "prisma",
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--exit-code",
    ],
    { cwd: root, env: process.env, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Greenfield database has Prisma schema drift (exit ${result.status})`);
  }
}

export async function verifyGreenfieldDatabase() {
  assertSafeE2EEnvironment();
  verifyPrismaDrift();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ledger = await client.query(
      'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name',
    );
    const constraints = await client.query(
      `SELECT conname FROM pg_constraint
         WHERE connamespace = 'public'::regnamespace AND conname = ANY($1::text[]) AND convalidated`,
      [requiredConstraints],
    );
    const indexes = await client.query(
      `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public' AND indexname = ANY($1::text[]) AND indexdef ILIKE '% WHERE %'`,
      [requiredPartialIndexes],
    );
    const triggers = await client.query(
      `SELECT count(*)::int AS count FROM pg_trigger
         WHERE NOT tgisinternal AND tgrelid IN (
           SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace
         )`,
    );
    const extensions = await client.query(
      `SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname`,
    );

    const ledgerNames = new Set(ledger.rows.map((row) => row.migration_name));
    const missingLedger = manifest.migrations
      .map(({ name }) => name)
      .filter((name) => !ledgerNames.has(name));
    const incompleteLedger = ledger.rows.filter(
      (row) => !row.finished_at || row.rolled_back_at,
    );
    if (missingLedger.length || incompleteLedger.length) {
      throw new Error(
        `Invalid Prisma migration ledger: ${missingLedger.length} missing, ${incompleteLedger.length} incomplete`,
      );
    }
    if (constraints.rowCount !== requiredConstraints.length) {
      throw new Error(
        `Missing database-only CHECK constraints: expected ${requiredConstraints.length}, found ${constraints.rowCount}`,
      );
    }
    if (indexes.rowCount !== requiredPartialIndexes.length) {
      throw new Error(
        `Missing partial unique indexes: expected ${requiredPartialIndexes.length}, found ${indexes.rowCount}`,
      );
    }
    if (triggers.rows[0].count !== 0 || extensions.rowCount !== 0) {
      throw new Error("Unexpected user trigger or non-default extension in greenfield database");
    }
    console.info(
      `Verified schema drift=none, migration ledger=${ledger.rowCount}, CHECK constraints=${constraints.rowCount}, partial indexes=${indexes.rowCount}.`,
    );
  } finally {
    await client.end();
  }
}
