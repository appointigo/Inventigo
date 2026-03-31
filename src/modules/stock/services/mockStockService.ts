// Mock stock service for UI-first development
// TODO: Replace with real stockService (which uses Prisma) when DB is connected

import { getOrgData } from "@/lib/mock-org-store";

export type MockStockRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  brandName: string;
  sizeId: string;
  sizeLabel: string;
  quantity: number;
  reorderLevel: number;
  status: "OK" | "LOW" | "OUT";
};

export type MockStockMovement = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "SALE" | "RETURN";
  quantity: number;
  reason: string | null;
  userName: string;
  createdAt: string;
};

export type MockAdjustInput = {
  productId: string;
  sizeId: string;
  quantity: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  reason?: string;
};

export type StockListFilters = {
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
};

export const mockStockService = {
  async getStockLevels(orgId: string, filters?: StockListFilters): Promise<MockStockRow[]> {
    const { stockRows } = getOrgData(orgId);
    let result = [...stockRows];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (r) => r.productName.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s)
      );
    }
    if (filters?.outOfStockOnly) {
      result = result.filter((r) => r.status === "OUT");
    } else if (filters?.lowStockOnly) {
      result = result.filter((r) => r.status === "LOW" || r.status === "OUT");
    }
    return result;
  },

  async adjustStock(orgId: string, input: MockAdjustInput, actingUserName = "Admin User"): Promise<MockStockRow | null> {
    const data = getOrgData(orgId);
    const row = data.stockRows.find(
      (r) => r.productId === input.productId && r.sizeId === input.sizeId
    );
    if (!row) return null;

    if (input.type === "IN") {
      row.quantity += Math.abs(input.quantity);
    } else if (input.type === "OUT") {
      row.quantity = Math.max(0, row.quantity - Math.abs(input.quantity));
    } else {
      row.quantity = Math.max(0, row.quantity + input.quantity);
    }

    row.status = row.quantity === 0 ? "OUT" : row.quantity <= row.reorderLevel ? "LOW" : "OK";

    data.stockMovements.unshift({
      id: `mv-${data.stockMvNextId++}`,
      productName: row.productName,
      sku: row.sku,
      sizeLabel: row.sizeLabel,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason ?? null,
      userName: actingUserName,
      createdAt: new Date().toISOString(),
    });

    return row;
  },

  async getMovements(orgId: string): Promise<MockStockMovement[]> {
    const { stockMovements } = getOrgData(orgId);
    return [...stockMovements];
  },
};
