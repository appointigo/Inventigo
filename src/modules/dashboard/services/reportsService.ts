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
    storeId: string,
    filters?: StockReportFilters
  ): Promise<StockReportRow[]> {
    const resolvedStoreId = storeId;

    const allStock = await stockService.getAllStockLevels(resolvedStoreId);

    const products = await prisma.product.findMany({
      where: { orgId },
      select: { id: true, costPrice: true },
    });
    const costPriceMap = new Map(products.map((p) => [p.id, Number(p.costPrice)]));

    let result: StockReportRow[] = allStock.map((row) => {
      const costPrice = costPriceMap.get(row.productId) ?? 0;
      return { ...row, costPrice, stockValue: Math.max(0, row.quantity) * costPrice };
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
    storeId: string,
    filters?: MovementReportFilters
  ): Promise<StockMovementRow[]> {
    const resolvedStoreId = storeId;

    const movementFilters = {
      storeId: resolvedStoreId,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      pageSize: 1000,
    };
    const first = await stockService.getMovementHistory({ ...movementFilters, page: 1 });
    const items = [...first.items];
    for (let page = 2; items.length < first.total; page += 1) {
      const next = await stockService.getMovementHistory({ ...movementFilters, page });
      items.push(...next.items);
      if (next.items.length === 0) break;
    }

    if (filters?.type) {
      return items.filter((m) => m.type === filters.type);
    }
    return items;
  },
};
