import type { MockStockRow, MockStockMovement } from "@/modules/stock/services/mockStockService";
import { mockStockService } from "@/modules/stock/services/mockStockService";

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

export type StockReportRow = MockStockRow & {
  costPrice: number;
  stockValue: number;
};

export const reportsService = {
  async getStockReport(filters?: StockReportFilters): Promise<StockReportRow[]> {
    const allStock = await mockStockService.getStockLevels();

    // Inline cost price map (matches productService data)
    const costPrices: Record<string, number> = {
      "prod-1": 900,
      "prod-2": 550,
      "prod-4": 1800,
      "prod-6": 1200,
      "prod-10": 600,
      "prod-12": 1000,
    };

    let result = allStock.map((row) => {
      const costPrice = costPrices[row.productId] ?? 0;
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

  async getMovementReport(filters?: MovementReportFilters): Promise<MockStockMovement[]> {
    const allMovements = await mockStockService.getMovements();
    let result = [...allMovements];

    if (filters?.type) {
      result = result.filter((m) => m.type === filters.type);
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter((m) => new Date(m.createdAt) >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((m) => new Date(m.createdAt) <= end);
    }

    return result;
  },
};
