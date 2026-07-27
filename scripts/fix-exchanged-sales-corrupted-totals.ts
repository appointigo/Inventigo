/**
 * Fix corrupted EXCHANGED Sale records
 * 
 * Background: The old exchange logic mutated Sale.subtotal and Sale.total
 * to incorrect values. This script repairs them.
 * 
 * For every Sale where status = 'EXCHANGED':
 *   1. Find the linked ReturnTransaction
 *   2. Get returnedUnitPrice * returnedQuantity (what customer originally paid)
 *   3. Reset Sale.total back to original
 *   4. Set Sale.amountPaid back to original total
 *   5. Set Sale.amountDue = 0
 *   6. Set Sale.paymentStatus = 'PAID'
 *   7. Keep Sale.status = 'EXCHANGED'
 *   8. Keep Sale.returnStatus = 'FULL' or 'PARTIAL'
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FixRecord {
  saleId: string;
  invoiceNumber: string;
  before: {
    total: number;
    subtotal: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: string;
  };
  after: {
    total: number;
    subtotal: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: string;
  };
  returnTransactionId: string;
  referenceNumber: string | null;
}

async function main() {
  console.log("[FIX EXCHANGED SALES] Starting data migration...\n");

  const fixedRecords: FixRecord[] = [];
  let processedCount = 0;
  let errorCount = 0;

  try {
    // Find all EXCHANGED sales
    const exchangedSales = await prisma.sale.findMany({
      where: { status: "EXCHANGED" },
      include: {
        returnTransactions: {
          include: { items: true },
        },
      },
    });

    console.log(`Found ${exchangedSales.length} EXCHANGED sales to fix\n`);

    for (const sale of exchangedSales) {
      try {
        // Find the return transaction for this sale
        if (!sale.returnTransactions || sale.returnTransactions.length === 0) {
          console.warn(`[SKIP] Sale ${sale.invoiceNumber}: No linked ReturnTransaction found`);
          continue;
        }

        const returnTx = sale.returnTransactions[0];
        const returnTxItems = returnTx.items;

        // Calculate the correct total from returned items
        // The correct amount is what the customer originally paid (returned items)
        let correctTotal = 0;
        for (const item of returnTxItems) {
          correctTotal += Number(item.returnedUnitPrice) * item.returnedQuantity;
        }

        // Log before values
        const before = {
          total: Number(sale.total),
          subtotal: Number(sale.subtotal),
          amountPaid: Number(sale.amountPaid),
          amountDue: Number(sale.amountDue),
          paymentStatus: sale.paymentStatus,
        };

        // Update the sale
        const updated = await prisma.sale.update({
          where: { id: sale.id },
          data: {
            subtotal: correctTotal,
            total: correctTotal,
            amountPaid: correctTotal,
            amountDue: 0,
            paymentStatus: "PAID",
          },
        });

        // Log after values
        const after = {
          total: Number(updated.total),
          subtotal: Number(updated.subtotal),
          amountPaid: Number(updated.amountPaid),
          amountDue: Number(updated.amountDue),
          paymentStatus: updated.paymentStatus,
        };

        fixedRecords.push({
          saleId: sale.id,
          invoiceNumber: sale.invoiceNumber,
          before,
          after,
          returnTransactionId: returnTx.id,
          referenceNumber: returnTx.referenceNumber,
        });

        processedCount++;
        console.log(`[OK] Fixed Sale ${sale.invoiceNumber}`);
        console.log(`  Before: total=${before.total}, amountPaid=${before.amountPaid}, amountDue=${before.amountDue}, status=${before.paymentStatus}`);
        console.log(`  After:  total=${after.total}, amountPaid=${after.amountPaid}, amountDue=${after.amountDue}, status=${after.paymentStatus}`);
        console.log(`  ReturnTransaction: ${returnTx.referenceNumber ?? returnTx.id}\n`);
      } catch (error) {
        errorCount++;
        console.error(`[ERROR] Failed to fix Sale ${sale.invoiceNumber}:`, error);
      }
    }

    console.log("\n─────────────────────────────────────────");
    console.log("MIGRATION SUMMARY");
    console.log("─────────────────────────────────────────");
    console.log(`Processed: ${processedCount} sales`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success: ${fixedRecords.length}`);
    console.log("─────────────────────────────────────────\n");

    // Print detailed log
    if (fixedRecords.length > 0) {
      console.log("FIXED RECORDS:");
      console.log(JSON.stringify(fixedRecords, null, 2));
    }
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
