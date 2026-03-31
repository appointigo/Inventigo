import type { DashboardData, StockByCategory, TopBrand, RecentMovement } from "../types";
import { productService } from "@/modules/products/services/productService";
import { poService } from "@/modules/purchase-orders/services/poService";
import { mockStockService } from "@/modules/stock/services/mockStockService";

// TODO: Replace with Prisma aggregation queries when DB is connected

export const dashboardService = {
  async getData(orgId: string): Promise<DashboardData> {
    const [allStock, allMovements, allProducts, allPOs] = await Promise.all([
      mockStockService.getStockLevels(orgId),
      mockStockService.getMovements(orgId),
      productService.list(orgId),
      poService.list(),
    ]);

    // KPIs
    const totalProducts = allProducts.length;
    const lowStockCount = allStock.filter((s) => s.status === "LOW" || s.status === "OUT").length;
    const pendingPOsCount = allPOs.filter(
      (po) => po.status === "DRAFT" || po.status === "ORDERED"
    ).length;

    // Total stock value: for each stock row, find the product's costPrice and multiply
    const costPriceMap = new Map<string, number>();
    for (const p of allProducts) {
      costPriceMap.set(p.id, p.costPrice);
    }
    const totalStockValue = allStock.reduce((sum, row) => {
      const cost = costPriceMap.get(row.productId) ?? 0;
      return sum + row.quantity * cost;
    }, 0);

    // Stock by category
    const categoryMap = new Map<string, number>();
    for (const row of allStock) {
      categoryMap.set(row.categoryName, (categoryMap.get(row.categoryName) ?? 0) + row.quantity);
    }
    const stockByCategory: StockByCategory[] = Array.from(categoryMap.entries())
      .map(([category, totalQuantity]) => ({ category, totalQuantity }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Top brands by stock value
    const brandMap = new Map<string, number>();
    for (const row of allStock) {
      const cost = costPriceMap.get(row.productId) ?? 0;
      const value = row.quantity * cost;
      brandMap.set(row.brandName, (brandMap.get(row.brandName) ?? 0) + value);
    }
    const topBrands: TopBrand[] = Array.from(brandMap.entries())
      .map(([brand, stockValue]) => ({ brand, stockValue }))
      .sort((a, b) => b.stockValue - a.stockValue);

    // Recent movements (last 10)
    const recentMovements: RecentMovement[] = allMovements.slice(0, 10).map((m) => ({
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
