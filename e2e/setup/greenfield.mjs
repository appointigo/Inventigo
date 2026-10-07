import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { assertSafeE2EEnvironment } from "./environment.mjs";

const { Client } = pg;
const root = fileURLToPath(new URL("../..", import.meta.url));
const migrationsRoot = path.join(root, "prisma/migrations");
const baselineRoot = path.join(root, "e2e/baseline");
const manifestPath = path.join(baselineRoot, "history-manifest.json");
const schemaPath = path.join(root, "prisma/schema.prisma");
const baselineSqlPath = path.join(baselineRoot, "20261007120000_schema.sql");
const databaseObjectsPath = path.join(baselineRoot, "database-objects.sql");
const executable = process.platform === "win32" ? "npx.cmd" : "npx";

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function fail(message) {
  throw new Error(`REFUSING E2E GREENFIELD BOOTSTRAP: ${message}`);
}

function runPrisma(args, { quiet = false, input } = {}) {
  const result = spawnSync(executable, ["prisma", ...args], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    input,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }
  if (!quiet) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

export function verifyBaselineInputs() {
  assertSafeE2EEnvironment();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const expectedArtifacts = [
    [schemaPath, manifest.schemaSha256, "Prisma schema"],
    [baselineSqlPath, manifest.baselineSqlSha256, "greenfield baseline SQL"],
    [databaseObjectsPath, manifest.databaseObjectsSqlSha256, "database-only objects SQL"],
  ];
  for (const [file, expected, label] of expectedArtifacts) {
    if (!expected || sha256(file) !== expected) {
      fail(`${label} changed without regenerating and auditing the baseline manifest`);
    }
  }

  const currentMigrations = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const incorporated = new Set(manifest.migrations.map(({ name }) => name));
  for (const { name, sha256: expected } of manifest.migrations) {
    const migrationFile = path.join(migrationsRoot, name, "migration.sql");
    if (!fs.existsSync(migrationFile) || sha256(migrationFile) !== expected) {
      fail(`historical migration ${name} changed after the audited baseline`);
    }
  }
  for (const name of currentMigrations) {
    if (!incorporated.has(name) && name <= manifest.boundary) {
      fail(`unreviewed historical migration ${name} appears before the baseline boundary`);
    }
  }
  const futureMigrations = currentMigrations.filter((name) => !incorporated.has(name));
  return { manifest, futureMigrations };
}

async function verifyLiveDatabaseIdentity() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query("SELECT current_database() AS database");
    const actual = result.rows[0]?.database;
    if (actual !== process.env.E2E_DATABASE_NAME) {
      fail(`connected database ${actual ?? "<unknown>"} does not match E2E_DATABASE_NAME`);
    }
    console.info(`Verified live disposable database identity: ${actual}`);
  } finally {
    await client.end();
  }
}

export async function prepareGreenfieldDatabase() {
  const { manifest, futureMigrations } = verifyBaselineInputs();
  await verifyLiveDatabaseIdentity();

  runPrisma(
    ["db", "execute", "--stdin"],
    {
      input: 'DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";\n',
    },
  );
  console.info("Reset disposable E2E public schema to empty.");

  runPrisma(["db", "execute", "--file", baselineSqlPath]);
  runPrisma(["db", "execute", "--file", databaseObjectsPath]);
  console.info("Applied audited greenfield schema and database-only invariants.");

  for (const [index, migration] of manifest.migrations.entries()) {
    runPrisma(["migrate", "resolve", "--applied", migration.name], { quiet: true });
    if ((index + 1) % 10 === 0 || index + 1 === manifest.migrations.length) {
      console.info(`Recorded ${index + 1}/${manifest.migrations.length} incorporated migrations.`);
    }
  }

  runPrisma(["migrate", "deploy"]);
  console.info(
    futureMigrations.length
      ? `Applied ${futureMigrations.length} forward migration(s) after the baseline boundary.`
      : "No forward migrations exist after the audited baseline boundary.",
  );
}
