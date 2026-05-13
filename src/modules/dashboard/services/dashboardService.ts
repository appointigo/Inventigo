import { prisma } from "@/lib/db";
import { stockService } from "@/modules/stock/services/stockService";
import type { DashboardData, StockByCategory, TopBrand, RecentMovement, RevenueTrendPoint, RevenueTrend } from "../types";

const formatDayKey = (date: Date) => date.toISOString().slice(0, 10);
const formatMonthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const formatYearKey = (date: Date) => String(date.getUTCFullYear());

const shiftDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const shiftMonths = (date: Date, months: number) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const buildRangePoints = (
  count: number,
  keyForOffset: (offset: number) => string,
  labelForKey: (key: string) => string,
  totalsMap: Map<string, number>
): RevenueTrendPoint[] => {
  return Array.from({ length: count }, (_, i) => {
    const offset = i - (count - 1);
    const key = keyForOffset(offset);
    return {
      label: labelForKey(key),
      total: Number((totalsMap.get(key) ?? 0).toFixed(2)),
    };
  });
};

export const dashboardService = {
  async getData(orgId: string, storeId: string | null, startDate?: Date, endDate?: Date): Promise<DashboardData> {
    // Resolve storeId — fall back to first store in the org if not set
    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const firstStore = await prisma.store.findFirst({ where: { orgId }, select: { id: true } });
      resolvedStoreId = firstStore?.id ?? null;
    }

    const [stockResult, movementsResult, productCosts, pendingPOsCount, totalProducts, sales] =
      await Promise.all([
        resolvedStoreId
          ? stockService.getStockLevels({ storeId: resolvedStoreId, page: 1, pageSize: 1000 })
          : Promise.resolve({ items: [], total: 0 }),
        resolvedStoreId
          ? stockService.getMovementHistory({
              storeId: resolvedStoreId,
              startDate,
              endDate,
              page: 1,
              pageSize: startDate || endDate ? 1000 : 10,
            })
          : Promise.resolve({ items: [], total: 0 }),
        prisma.product.findMany({
          where: { orgId },
          select: { id: true, costPrice: true },
        }),
        prisma.purchaseOrder.count({
          where: { status: { in: ["DRAFT", "ORDERED"] }, store: { orgId } },
        }),
        prisma.product.count({ where: { orgId } }),
        prisma.sale.findMany({
          where: {
            status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
            ...(resolvedStoreId ? { storeId: resolvedStoreId } : { store: { orgId } }),
          },
          select: { transactionDate: true, total: true },
          orderBy: { transactionDate: "asc" },
        }),
      ]);

    // Also include return transactions (net amounts) so that revenue trend reflects exchanges/refunds
    const returnTxns = await prisma.returnTransaction.findMany({
      where: {
        ...(resolvedStoreId ? { storeId: resolvedStoreId } : { store: { orgId } }),
      },
      select: { businessDate: true, createdAt: true, netAmount: true, offsetAmount: true, type: true },
      orderBy: { businessDate: "asc" },
    });

    const allStock = stockResult.items;
    const allMovements = movementsResult.items;

    const costPriceMap = new Map<string, number>();
    for (const p of productCosts) {
      costPriceMap.set(p.id, Number(p.costPrice));
    }

    const lowStockCount = allStock.filter((s) => s.status === "LOW" || s.status === "OUT").length;
    const totalStockValue = allStock.reduce(
      (sum, row) => sum + row.quantity * (costPriceMap.get(row.productId) ?? 0),
      0
    );

    const brandMap = new Map<string, number>();
    const categoryQuantityMap = new Map<string, number>();
    const categoryValueMap = new Map<string, number>();
    for (const row of allStock) {
      const value = row.quantity * (costPriceMap.get(row.productId) ?? 0);
      brandMap.set(row.brandName, (brandMap.get(row.brandName) ?? 0) + value);
      categoryQuantityMap.set(row.categoryName, (categoryQuantityMap.get(row.categoryName) ?? 0) + row.quantity);
      categoryValueMap.set(row.categoryName, (categoryValueMap.get(row.categoryName) ?? 0) + value);
    }

    const stockByCategory: StockByCategory[] = Array.from(categoryValueMap.entries())
      .map(([category, totalValue]) => ({
        category,
        totalQuantity: categoryQuantityMap.get(category) ?? 0,
        totalValue,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const topBrands: TopBrand[] = Array.from(brandMap.entries())
      .map(([brand, stockValue]) => ({ brand, stockValue }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const dayTotals = new Map<string, number>();
    const monthTotals = new Map<string, number>();
    const yearTotals = new Map<string, number>();
    for (const sale of sales) {
      const total = Number(sale.total);
      const dayKey = formatDayKey(sale.transactionDate);
      const monthKey = formatMonthKey(sale.transactionDate);
      const yearKey = formatYearKey(sale.transactionDate);
      dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + total);
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + total);
      yearTotals.set(yearKey, (yearTotals.get(yearKey) ?? 0) + total);
    }

    // Add return transaction amounts to revenue tracking
    // For EXCHANGE: offsetAmount (credit from returned item) + netAmount (additional payment) = total new product value
    // For RETURN: netAmount (refund adjustment, typically negative)
    for (const rt of returnTxns) {
      let revenueAmount = Number(rt.netAmount ?? 0);
      
      // For exchange transactions, include the full value of the exchanged product
      // This properly reflects the new product being sold in place of the old one
      if (rt.type === "EXCHANGE") {
        revenueAmount = Number(rt.offsetAmount ?? 0) + Number(rt.netAmount ?? 0);
      }
      
      const reportDate = rt.businessDate ?? rt.createdAt;
      const dayKey = formatDayKey(reportDate as Date);
      const monthKey = formatMonthKey(reportDate as Date);
      const yearKey = formatYearKey(reportDate as Date);
      dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + revenueAmount);
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + revenueAmount);
      yearTotals.set(yearKey, (yearTotals.get(yearKey) ?? 0) + revenueAmount);
    }

    const now = new Date();
    const revenueTrend: RevenueTrend = {
      day: buildRangePoints(
        14,
        (offset) => formatDayKey(shiftDays(now, offset)),
        (key) => {
          const [year, month, day] = key.split("-").map(Number);
          return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        },
        dayTotals
      ),
      month: buildRangePoints(
        12,
        (offset) => formatMonthKey(shiftMonths(now, offset)),
        (key) => {
          const [year, month] = key.split("-").map(Number);
          return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        },
        monthTotals
      ),
      year: buildRangePoints(
        5,
        (offset) => String(now.getUTCFullYear() + offset),
        (key) => key,
        yearTotals
      ),
    };

    const recentMovements: RecentMovement[] = allMovements.map((m) => ({
      id: m.id,
      productName: m.productName,
      sku: m.sku,
      categoryName: m.categoryName,
      sizeLabel: m.sizeLabel,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userName: m.userName,
      movementDate: m.movementDate,
      createdAt: m.createdAt,
    }));

    return {
      kpis: { totalProducts, totalStockValue, lowStockCount, pendingPOsCount },
      stockByCategory,
      topBrands,
      revenueTrend,
      recentMovements,
    };
  },
};
