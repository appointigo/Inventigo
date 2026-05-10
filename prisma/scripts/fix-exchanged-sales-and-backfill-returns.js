#!/usr/bin/env node
/*
  One-time migration script:
  - Backfill missing `referenceNumber` on ReturnTransaction rows using RET-YYYYMMDD-{STORETOKEN}-{SEQ}
  - Fix Sale records with status = 'EXCHANGED' by recalculating totals from linked ReturnTransaction returned items
  - Logs before/after values for each updated Sale and ReturnTransaction

  Usage: node prisma/scripts/fix-exchanged-sales-and-backfill-returns.js
*/

// Load environment variables from .env for standalone script runs
require("dotenv").config();

const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// Initialize Prisma Client with the PrismaPg adapter so scripts run the same
// way as the application's `src/lib/db.ts`.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const pad = (v, len = 4) => String(v).padStart(len, "0");
const toDateStr = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

const storeToken = (storeId) => storeId.replace(/-/g, "").slice(0, 6).toUpperCase();

async function backfillReturnReferenceNumbers() {
  console.log("Starting backfill of ReturnTransaction.referenceNumber...");
  // Prisma client schema marks `referenceNumber` as required, so querying
  // for `referenceNumber: null` via Prisma filters is invalid. Use a raw SQL
  // query to find rows where the DB column is NULL.
  const missing = await prisma.$queryRawUnsafe(`
    SELECT id, "storeId" AS "storeId", "createdAt" AS "createdAt"
    FROM "return_transactions"
    WHERE "referenceNumber" IS NULL
    ORDER BY "createdAt" ASC
  `);

  if (!missing.length) {
    console.log("No ReturnTransaction rows missing referenceNumber.");
    return;
  }

  // Group by storeId + date
  const groups = new Map();
  for (const row of missing) {
    const dateStr = toDateStr(row.createdAt);
    const key = `${row.storeId}:${dateStr}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  for (const [key, rows] of groups.entries()) {
    const [storeId, dateStr] = key.split(":");
    const start = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`);
    const end = new Date(start.getTime() + 86400000);
    const prefix = `RET-${dateStr}-${storeToken(storeId)}-`;

    const latest = await prisma.returnTransaction.findFirst({
      where: { storeId, createdAt: { gte: start, lt: end }, referenceNumber: { startsWith: prefix } },
      orderBy: { createdAt: "desc" },
      select: { referenceNumber: true },
    });

    let nextSeq = Number(latest?.referenceNumber?.split("-").at(-1) ?? "0") + 1;
    rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const r of rows) {
      const ref = `${prefix}${pad(nextSeq)}`;
      await prisma.returnTransaction.update({ where: { id: r.id }, data: { referenceNumber: ref } });
      console.log(`Backfilled ReturnTransaction ${r.id} -> ${ref}`);
      nextSeq += 1;
    }
  }

  console.log("Finished backfilling ReturnTransaction.referenceNumber.");
}

async function fixExchangedSales() {
  console.log("Starting fix for Sale rows with status = 'EXCHANGED'...");
  const exchanged = await prisma.sale.findMany({
    where: { status: "EXCHANGED" },
    select: { id: true, subtotal: true, total: true, amountPaid: true, amountDue: true, paymentStatus: true },
  });

  if (!exchanged.length) {
    console.log("No exchanged Sale records found.");
    return;
  }

  for (const s of exchanged) {
    // Find linked return transactions
    const rts = await prisma.returnTransaction.findMany({ where: { originalSaleId: s.id }, include: { items: true } });
    if (!rts.length) {
      console.log(`Sale ${s.id} has status EXCHANGED but no linked ReturnTransaction; skipping.`);
      continue;
    }

    // Compute correct total as sum of returnedUnitPrice * returnedQuantity across returned items
    let correctTotal = 0;
    for (const rt of rts) {
      for (const it of rt.items ?? []) {
        if (it.returnedProductId) {
          correctTotal += Number(it.returnedUnitPrice) * Number(it.returnedQuantity);
        }
      }
    }

    if (!correctTotal || correctTotal <= 0) {
      console.log(`Sale ${s.id} computed correctTotal=${correctTotal}; skipping update.`);
      continue;
    }

    const before = {
      subtotal: String(s.subtotal),
      total: String(s.total),
      amountPaid: String(s.amountPaid ?? 0),
      amountDue: String(s.amountDue ?? 0),
      paymentStatus: s.paymentStatus,
    };

    const updated = await prisma.sale.update({
      where: { id: s.id },
      data: {
        subtotal: new Prisma.Decimal(correctTotal),
        total: new Prisma.Decimal(correctTotal),
        amountPaid: new Prisma.Decimal(correctTotal),
        amountDue: new Prisma.Decimal(0),
        paymentStatus: "PAID",
      },
    });

    const after = {
      subtotal: String(updated.subtotal),
      total: String(updated.total),
      amountPaid: String(updated.amountPaid ?? 0),
      amountDue: String(updated.amountDue ?? 0),
      paymentStatus: updated.paymentStatus,
    };

    console.log(`Fixed Sale ${s.id}: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }

  console.log("Finished fixing exchanged Sale records.");
}

async function main() {
  try {
    await backfillReturnReferenceNumbers();
    await fixExchangedSales();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
