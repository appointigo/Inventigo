import { prisma } from "@/lib/db";
import { stockService } from "@/modules/stock/services/stockService";
import type { StockLevelRow, StockMovementRow } from "@/modules/stock/types";

export type StockReportFilters = {
  categoryName?: string;
  brandName?: string;
  status?: "OK" | "LOW" | "OUT";
};

export type MovementReportFilters = {
  type?: string;
  startDate?: string;
  endDate?: string;
};

export type StockReportRow = StockLevelRow & {
  costPrice: number;
  stockValue: number;
};

export const reportsService = {
  async getStockReport(
    orgId: string,
    storeId: string | null,
    filters?: StockReportFilters
  ): Promise<StockReportRow[]> {
    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const firstStore = await prisma.store.findFirst({ where: { orgId }, select: { id: true } });
      resolvedStoreId = firstStore?.id ?? null;
    }
    if (!resolvedStoreId) return [];

    const { items: allStock } = await stockService.getStockLevels({
      storeId: resolvedStoreId,
      page: 1,
      pageSize: 10000,
    });

    const products = await prisma.product.findMany({
      where: { orgId },
      select: { id: true, costPrice: true },
    });
    const costPriceMap = new Map(products.map((p) => [p.id, Number(p.costPrice)]));

    let result: StockReportRow[] = allStock.map((row) => {
      const costPrice = costPriceMap.get(row.productId) ?? 0;
      return { ...row, costPrice, stockValue: row.quantity * costPrice };
    });

    if (filters?.categoryName) {
      result = result.filter((r) => r.categoryName === filters.categoryName);
    }
    if (filters?.brandName) {
      result = result.filter((r) => r.brandName === filters.brandName);
    }
    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }

    return result;
  },

  async getMovementReport(
    orgId: string,
    storeId: string | null,
    filters?: MovementReportFilters
  ): Promise<StockMovementRow[]> {
    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const firstStore = await prisma.store.findFirst({ where: { orgId }, select: { id: true } });
      resolvedStoreId = firstStore?.id ?? null;
    }
    if (!resolvedStoreId) return [];

    const { items } = await stockService.getMovementHistory({
      storeId: resolvedStoreId,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      page: 1,
      pageSize: 10000,
    });

    if (filters?.type) {
      return items.filter((m) => m.type === filters.type);
    }
    return items;
  },
};
