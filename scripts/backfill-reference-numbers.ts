/**
 * Backfill referenceNumber for existing ReturnTransaction records
 * 
 * This script generates RET-YYYYMMDD-{STORECODE}-{SEQUENCE} format
 * for all ReturnTransaction records that don't have a referenceNumber.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const generateReferenceNumberForRecord = async (
  returnTx: any,
  storeId: string,
): Promise<string> => {
  // Use the transaction's createdAt for date part
  const txDate = returnTx.createdAt instanceof Date 
    ? returnTx.createdAt 
    : new Date(returnTx.createdAt);
  
  const dateStr = txDate.toISOString().slice(0, 10).replace(/-/g, "");
  const storeToken = storeId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const prefix = `RET-${dateStr}-${storeToken}-`;
  
  const startOfDay = new Date(
    txDate.getFullYear(),
    txDate.getMonth(),
    txDate.getDate()
  );
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  // Find the highest sequence number for this day
  const latest = await prisma.returnTransaction.findFirst({
    where: {
      storeId,
      createdAt: { gte: startOfDay, lt: endOfDay },
      referenceNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { referenceNumber: true },
  });

  const latestSeq = Number(latest?.referenceNumber?.split("-").at(-1) ?? "0");
  const nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
};

async function main() {
  console.log("[BACKFILL REFERENCE NUMBERS] Starting...\n");

  try {
    // Find all ReturnTransactions without referenceNumber
    const needsBackfill = await prisma.returnTransaction.findMany({
      where: { referenceNumber: null as any },
      include: { store: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${needsBackfill.length} records needing referenceNumber\n`);

    let fixedCount = 0;
    for (const rt of needsBackfill) {
      try {
        const refNum = await generateReferenceNumberForRecord(rt, rt.storeId);
        
        // Check if this refNum is already taken (race condition)
        const existing = await prisma.returnTransaction.findFirst({
          where: { referenceNumber: refNum },
        });

        if (existing) {
          console.warn(`[SKIP] ReturnTransaction ${rt.id}: refNum ${refNum} already taken`);
          continue;
        }

        const updated = await prisma.returnTransaction.update({
          where: { id: rt.id },
          data: { referenceNumber: refNum },
        });

        console.log(`[OK] Generated ${updated.referenceNumber} for ReturnTransaction ${rt.id}`);
        fixedCount++;
      } catch (error) {
        console.error(`[ERROR] Failed for ReturnTransaction ${rt.id}:`, error);
      }
    }

    console.log(`\nBackfilled ${fixedCount} records`);
  } catch (error) {
    console.error("[FATAL ERROR]", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
