import { prisma } from "@/lib/db";
import { salesAnalyticsService } from "@/modules/analytics/services/salesAnalyticsService";
import {
  addBusinessDays,
  businessDateForInstant,
  businessDateStart,
} from "@/modules/analytics/utils/dateRange";
import { stockService } from "@/modules/stock/services/stockService";
import type {
  DashboardData,
  RecentMovement,
  RevenueTrendPoint,
  StockByCategory,
  TopBrand,
} from "../types";

const shiftMonth = (businessDate: string, months: number) => {
  const [year, month] = businessDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const shiftYear = (businessDate: string, years: number) =>
  `${Number(businessDate.slice(0, 4)) + years}-01-01`;

const revenuePoints = (trend: Array<{ label: string; revenue: number }>): RevenueTrendPoint[] =>
  trend.map((point) => ({ label: point.label, total: point.revenue }));

export const dashboardServiceCompat = {
  async getData(
    orgId: string,
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardData> {
    const today = businessDateForInstant(new Date());
    const to = businessDateStart(today);
    const [
      allStock,
      movementsResult,
      productCosts,
      pendingPOsCount,
      totalProducts,
      daily,
      monthly,
      yearly,
    ] = await Promise.all([
      stockService.getAllStockLevels(storeId),
      stockService.getMovementHistory({ storeId, startDate, endDate, page: 1, pageSize: 10 }),
      prisma.product.findMany({ where: { orgId }, select: { id: true, costPrice: true } }),
      prisma.purchaseOrder.count({
        where: { storeId, status: { in: ["DRAFT", "ORDERED"] }, store: { orgId } },
      }),
      prisma.product.count({ where: { orgId, stockEntries: { some: { storeId } } } }),
      salesAnalyticsService.getAnalytics(
        orgId,
        storeId,
        businessDateStart(addBusinessDays(today, -13)),
        to,
        "day"
      ),
      salesAnalyticsService.getAnalytics(
        orgId,
        storeId,
        businessDateStart(shiftMonth(today, -11)),
        to,
        "month"
      ),
      salesAnalyticsService.getAnalytics(
        orgId,
        storeId,
        businessDateStart(shiftYear(today, -4)),
        to,
        "year"
      ),
    ]);

    const costPriceMap = new Map(
      productCosts.map((product) => [product.id, Number(product.costPrice)])
    );
    const lowStockCount = allStock.filter((row) => row.status !== "OK").length;
    const totalStockValue = allStock.reduce(
      (sum, row) => sum + Math.max(0, row.quantity) * (row.averageUnitCost ?? costPriceMap.get(row.productId) ?? 0),
      0
    );
    const brandMap = new Map<string, number>();
    const categoryQuantityMap = new Map<string, number>();
    const categoryValueMap = new Map<string, number>();
    for (const row of allStock) {
      const quantity = Math.max(0, row.quantity);
      const value = quantity * (row.averageUnitCost ?? costPriceMap.get(row.productId) ?? 0);
      brandMap.set(row.brandName, (brandMap.get(row.brandName) ?? 0) + value);
      categoryQuantityMap.set(
        row.categoryName,
        (categoryQuantityMap.get(row.categoryName) ?? 0) + quantity
      );
      categoryValueMap.set(row.categoryName, (categoryValueMap.get(row.categoryName) ?? 0) + value);
    }
    const stockByCategory: StockByCategory[] = [...categoryValueMap.entries()]
      .map(([category, totalValue]) => ({
        category,
        totalQuantity: categoryQuantityMap.get(category) ?? 0,
        totalValue,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
    const topBrands: TopBrand[] = [...brandMap.entries()]
      .map(([brand, stockValue]) => ({ brand, stockValue }))
      .sort((a, b) => b.stockValue - a.stockValue);
    const recentMovements: RecentMovement[] = movementsResult.items.map((movement) => ({
      id: movement.id,
      productName: movement.productName,
      sku: movement.sku,
      categoryName: movement.categoryName,
      sizeLabel: movement.sizeLabel,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      userName: movement.userName,
      movementDate: movement.movementDate,
      createdAt: movement.createdAt,
    }));

    return {
      kpis: { totalProducts, totalStockValue, lowStockCount, pendingPOsCount },
      stockByCategory,
      topBrands,
      revenueTrend: {
        day: revenuePoints(daily.trend),
        month: revenuePoints(monthly.trend),
        year: revenuePoints(yearly.trend),
      },
      recentMovements,
    };
  },
};
