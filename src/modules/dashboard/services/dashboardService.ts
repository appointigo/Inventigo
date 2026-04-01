import { prisma } from "@/lib/db";
import { stockService } from "@/modules/stock/services/stockService";
import type { DashboardData, StockByCategory, TopBrand, RecentMovement } from "../types";

export const dashboardService = {
  async getData(orgId: string, storeId: string | null): Promise<DashboardData> {
    // Resolve storeId — fall back to first store in the org if not set
    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const firstStore = await prisma.store.findFirst({ where: { orgId }, select: { id: true } });
      resolvedStoreId = firstStore?.id ?? null;
    }

    const [stockResult, movementsResult, productCosts, pendingPOsCount, totalProducts] =
      await Promise.all([
        resolvedStoreId
          ? stockService.getStockLevels({ storeId: resolvedStoreId, page: 1, pageSize: 1000 })
          : Promise.resolve({ items: [], total: 0 }),
        resolvedStoreId
          ? stockService.getMovementHistory({ storeId: resolvedStoreId, page: 1, pageSize: 10 })
          : Promise.resolve({ items: [], total: 0 }),
        prisma.product.findMany({
          where: { orgId },
          select: { id: true, costPrice: true },
        }),
        prisma.purchaseOrder.count({
          where: { status: { in: ["DRAFT", "ORDERED"] }, store: { orgId } },
        }),
        prisma.product.count({ where: { orgId } }),
      ]);

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

    const categoryMap = new Map<string, number>();
    for (const row of allStock) {
      categoryMap.set(row.categoryName, (categoryMap.get(row.categoryName) ?? 0) + row.quantity);
    }
    const stockByCategory: StockByCategory[] = Array.from(categoryMap.entries())
      .map(([category, totalQuantity]) => ({ category, totalQuantity }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const brandMap = new Map<string, number>();
    for (const row of allStock) {
      const value = row.quantity * (costPriceMap.get(row.productId) ?? 0);
      brandMap.set(row.brandName, (brandMap.get(row.brandName) ?? 0) + value);
    }
    const topBrands: TopBrand[] = Array.from(brandMap.entries())
      .map(([brand, stockValue]) => ({ brand, stockValue }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const recentMovements: RecentMovement[] = allMovements.map((m) => ({
      id: m.id,
      productName: m.productName,
      sku: m.sku,
      sizeLabel: m.sizeLabel,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userName: m.userName,
      createdAt: m.createdAt,
    }));

    return {
      kpis: { totalProducts, totalStockValue, lowStockCount, pendingPOsCount },
      stockByCategory,
      topBrands,
      recentMovements,
    };
  },
};
