import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsGroup, FinancialEvent, SalesAnalyticsResponse } from "../types";
import { aggregateFinancialEvents, calculateReturnCostEvent } from "../utils/financialAggregation";

const saleSelect = {
  transactionDate: true,
  total: true,
  discountAmount: true,
  items: { select: { quantity: true, costPrice: true } },
} satisfies Prisma.SaleSelect;

const returnSelect = {
  type: true,
  businessDate: true,
  netAmount: true,
  refundAmount: true,
  discountAmount: true,
  items: {
    select: {
      returnedProductId: true,
      returnedSizeId: true,
      returnedQuantity: true,
      returnedUnitPrice: true,
      returnedLineAmount: true,
      newProductId: true,
      newQuantity: true,
      newUnitPrice: true,
      newCostPrice: true,
    },
  },
  sale: {
    select: {
      items: { select: { productId: true, sizeId: true, costPrice: true } },
    },
  },
} satisfies Prisma.ReturnTransactionSelect;

const number = (value: unknown) => Number(value ?? 0);
const variantKey = (productId: string, sizeId: string) => `${productId}:${sizeId}`;

export const salesAnalyticsService = {
  async getAnalytics(
    orgId: string,
    storeId: string,
    from: Date,
    to: Date,
    group: AnalyticsGroup,
  ): Promise<SalesAnalyticsResponse> {
    const endExclusive = new Date(to);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const scope = { storeId, store: { orgId } };
    const [sales, returns] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...scope,
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { gte: from, lt: endExclusive },
        },
        select: saleSelect,
        orderBy: { transactionDate: "asc" },
      }),
      prisma.returnTransaction.findMany({
        where: { ...scope, businessDate: { gte: from, lt: endExclusive } },
        select: returnSelect,
        orderBy: { businessDate: "asc" },
      }),
    ]);

    const events: FinancialEvent[] = sales.map((sale) => {
      const costs = sale.items.map((item) =>
        item.costPrice === null ? null : number(item.costPrice) * item.quantity
      );
      return {
        date: sale.transactionDate,
        revenue: number(sale.total),
        cogs: costs.every((cost) => cost !== null)
          ? costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
          : null,
        discount: number(sale.discountAmount),
        orderCount: 1,
        returnValue: 0,
        returnCount: 0,
        exchangeCount: 0,
        completenessReasons: costs.some((cost) => cost === null)
          ? ["MISSING_SALE_ITEM_COST"]
          : [],
      };
    });

    for (const transaction of returns) {
      const originalCosts = new Map(
        transaction.sale.items.map((item) => [
          variantKey(item.productId, item.sizeId),
          item.costPrice === null ? null : number(item.costPrice),
        ]),
      );
      const returnedItems = transaction.items.filter(
        (item) => item.returnedProductId && item.returnedSizeId && item.returnedQuantity > 0,
      );
      const replacementItems = transaction.items.filter(
        (item) => item.newProductId && (item.newQuantity ?? 0) > 0,
      );

      const returnedRevenue = returnedItems.reduce(
        (sum, item) => sum + number(item.returnedLineAmount ?? number(item.returnedUnitPrice) * item.returnedQuantity),
        0,
      );
      const returnedCosts = returnedItems.map((item) => {
        const unitCost = originalCosts.get(variantKey(item.returnedProductId!, item.returnedSizeId!));
        return unitCost == null ? null : unitCost * item.returnedQuantity;
      });
      const replacementRevenue = replacementItems.reduce(
        (sum, item) => sum + number(item.newUnitPrice) * number(item.newQuantity),
        0,
      );
      const replacementCosts = replacementItems.map((item) =>
        item.newCostPrice === null ? null : number(item.newCostPrice) * number(item.newQuantity),
      );
      const hasDetailedItems = returnedItems.length > 0 || replacementItems.length > 0;
      const revenue = hasDetailedItems
        ? replacementRevenue - returnedRevenue
        : transaction.type === "RETURN"
          ? -number(transaction.refundAmount)
          : number(transaction.netAmount);
      const { cogs, completenessReasons } = calculateReturnCostEvent(
        returnedCosts, replacementCosts, hasDetailedItems,
      );

      events.push({
        date: transaction.businessDate,
        revenue,
        cogs,
        discount: number(transaction.discountAmount),
        orderCount: 0,
        returnValue: returnedRevenue || number(transaction.refundAmount),
        returnCount: transaction.type === "EXCHANGE" ? 0 : 1,
        exchangeCount: transaction.type === "RETURN" ? 0 : 1,
        completenessReasons,
      });
    }

    return aggregateFinancialEvents(events, from, to, group);
  },
};
