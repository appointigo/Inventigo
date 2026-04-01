import { StockMovementType, ReferenceType } from "@prisma/client";

export type AdjustStockInput = {
  productId: string;
  sizeId: string;
  storeId: string;
  quantity: number;
  type: StockMovementType;
  reason?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  userId: string;
};

export type StockLevelFilters = {
  storeId: string;
  categoryId?: string;
  brandId?: string;
  productId?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type StockLevelRow = {
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
  reorderQuantity: number;
  status: "OK" | "LOW" | "OUT";
  lastRestockedAt: Date | null;
};

export type StockMovementRow = {
  id: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  type: string;
  quantity: number;
  reason: string | null;
  userName: string;
  createdAt: string;
};

export type MovementHistoryFilters = {
  storeId: string;
  productId?: string;
  type?: StockMovementType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};
