import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canonicalCustomerOrderValue } from "@/modules/analytics/utils/canonicalMetrics";
import { summarizeIntegrity } from "../utils/integritySummary";

export type IntegrityIssue = {
  code: string;
  severity: "warning" | "error";
  count: number;
  description: string;
  sampleReferences: string[];
};

const issue = (
  code: string,
  severity: IntegrityIssue["severity"],
  description: string,
  rows: Array<{ id: string }>,
  count = rows.length
): IntegrityIssue => ({
  code,
  severity,
  count,
  description,
  sampleReferences: rows.slice(0, 10).map((row) => row.id),
});

export const dataIntegrityService = {
  async inspect(orgId: string, storeId: string) {
    const cutoverRows = await prisma.$queryRaw<Array<{ finished_at: Date | null }>>`
      SELECT finished_at
      FROM _prisma_migrations
      WHERE migration_name = '20260505120000_add_returns_and_partial_payments'
        AND finished_at IS NOT NULL
      ORDER BY finished_at ASC
      LIMIT 1
    `;
    const paymentLedgerCutover =
      cutoverRows[0]?.finished_at ?? new Date("2026-05-13T00:00:00.000Z");
    const [
      saleItemTotal,
      missingSaleCostTotal,
      missingSaleCosts,
      zeroSaleCostTotal,
      zeroSaleCosts,
      replacementsTotal,
      missingReplacementCostTotal,
      missingReplacementCosts,
      missingPaymentTotal,
      missingPayments,
      negativeStockTotal,
      negativeStock,
      ambiguousAdjustmentTotal,
      ambiguousAdjustments,
      crossStoreCountRows,
      crossStoreRows,
      customers,
    ] = await Promise.all([
      prisma.saleItem.count({ where: { sale: { storeId, store: { orgId } } } }),
      prisma.saleItem.count({ where: { costPrice: null, sale: { storeId, store: { orgId } } } }),
      prisma.saleItem.findMany({
        where: { costPrice: null, sale: { storeId, store: { orgId } } },
        select: { id: true },
        take: 100,
      }),
      prisma.saleItem.count({
        where: {
          costPrice: { equals: new Prisma.Decimal(0) },
          sale: { storeId, store: { orgId } },
        },
      }),
      prisma.saleItem.findMany({
        where: {
          costPrice: { equals: new Prisma.Decimal(0) },
          sale: { storeId, store: { orgId } },
        },
        select: { id: true },
        take: 100,
      }),
      prisma.returnTransactionItem.count({
        where: {
          newProductId: { not: null },
          newQuantity: { gt: 0 },
          returnTransaction: { storeId, store: { orgId } },
        },
      }),
      prisma.returnTransactionItem.count({
        where: {
          newProductId: { not: null },
          newQuantity: { gt: 0 },
          newCostPrice: null,
          returnTransaction: { storeId, store: { orgId } },
        },
      }),
      prisma.returnTransactionItem.findMany({
        where: {
          newProductId: { not: null },
          newQuantity: { gt: 0 },
          newCostPrice: null,
          returnTransaction: { storeId, store: { orgId } },
        },
        select: { id: true },
        take: 100,
      }),
      prisma.sale.count({
        where: {
          storeId,
          store: { orgId },
          createdAt: { gte: paymentLedgerCutover },
          amountPaid: { gt: 0 },
          payments: { none: {} },
        },
      }),
      prisma.sale.findMany({
        where: {
          storeId,
          store: { orgId },
          createdAt: { gte: paymentLedgerCutover },
          amountPaid: { gt: 0 },
          payments: { none: {} },
        },
        select: { id: true },
        take: 100,
      }),
      prisma.stockEntry.count({ where: { storeId, store: { orgId }, quantity: { lt: 0 } } }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId }, quantity: { lt: 0 } },
        select: { id: true },
        take: 100,
      }),
      prisma.stockMovement.count({
        where: { storeId, store: { orgId }, type: "ADJUSTMENT", deltaQuantity: null },
      }),
      prisma.stockMovement.findMany({
        where: { storeId, store: { orgId }, type: "ADJUSTMENT", deltaQuantity: null },
        select: { id: true },
        take: 100,
      }),
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM stock_entries se
        JOIN products p ON p.id = se."productId"
        JOIN stores s ON s.id = se."storeId"
        WHERE se."storeId" = ${storeId} AND s."orgId" = ${orgId} AND p."orgId" <> s."orgId"
      `,
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT se.id
        FROM stock_entries se
        JOIN products p ON p.id = se."productId"
        JOIN stores s ON s.id = se."storeId"
        WHERE se."storeId" = ${storeId} AND s."orgId" = ${orgId} AND p."orgId" <> s."orgId"
        LIMIT 100
      `,
      prisma.customer.findMany({
        where: {
          orgId,
          OR: [{ preferredStoreId: storeId }, { sales: { some: { storeId } } }],
        },
        select: {
          id: true,
          totalSpent: true,
          sales: {
            where: { store: { orgId }, status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] } },
            select: {
              total: true,
              finalPayableAmount: true,
              returnTransactions: { select: { netAmount: true, refundAmount: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);

    const customerDrift = customers
      .filter((customer) => {
        const canonical = customer.sales.reduce(
          (sum, sale) =>
            sum +
            canonicalCustomerOrderValue({
              saleAmount: sale.finalPayableAmount ?? sale.total,
              returns: sale.returnTransactions,
            }),
          0
        );
        return Math.abs(canonical - customer.totalSpent) > 0.01;
      })
      .map((customer) => ({ id: customer.id }));

    const issues = [
      issue(
        "MISSING_SALE_ITEM_COST",
        "error",
        "Sale items without an immutable cost snapshot.",
        missingSaleCosts,
        missingSaleCostTotal
      ),
      issue(
        "ZERO_SALE_ITEM_COST",
        "warning",
        "Sale items with a zero cost snapshot; verify that zero is intentional.",
        zeroSaleCosts,
        zeroSaleCostTotal
      ),
      issue(
        "MISSING_EXCHANGE_REPLACEMENT_COST",
        "error",
        "Exchange replacements without an immutable cost snapshot.",
        missingReplacementCosts,
        missingReplacementCostTotal
      ),
      issue(
        "MISSING_PAYMENT_LEDGER",
        "error",
        "Post-cutover paid sales without payment ledger rows.",
        missingPayments,
        missingPaymentTotal
      ),
      issue(
        "NEGATIVE_STOCK",
        "error",
        "Stock entries with a negative quantity.",
        negativeStock,
        negativeStockTotal
      ),
      issue(
        "AMBIGUOUS_STOCK_ADJUSTMENT",
        "warning",
        "Legacy stock adjustments without a signed delta.",
        ambiguousAdjustments,
        ambiguousAdjustmentTotal
      ),
      issue(
        "STORE_SCOPE_MISMATCH",
        "error",
        "Stock rows whose product and store belong to different organizations.",
        crossStoreRows,
        crossStoreCountRows[0]?.count ?? 0
      ),
      issue(
        "CUSTOMER_TOTAL_DRIFT",
        "warning",
        "Cached customer lifetime total differs from canonical transaction history (latest 100 store customers checked).",
        customerDrift
      ),
    ];
    const totalCostRows = saleItemTotal + replacementsTotal;
    const completeCostRows = Math.max(
      0,
      totalCostRows - missingSaleCostTotal - missingReplacementCostTotal
    );
    return {
      scope: { type: "STORE" as const, storeId },
      generatedAt: new Date().toISOString(),
      ...summarizeIntegrity(issues, completeCostRows, totalCostRows),
      issues,
      notes: [
        "Issue counts are complete; sample references are bounded to the first 10 rows.",
        "Legacy ambiguous adjustments are not backfilled or guessed.",
      ],
    };
  },
};
