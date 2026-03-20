import { PurchaseOrderStatus } from "@prisma/client";

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "default",
  ORDERED: "processing",
  RECEIVED: "success",
  CANCELLED: "error",
};

export const STOCK_STATUS = {
  OK: { label: "In Stock", color: "success" },
  LOW: { label: "Low Stock", color: "warning" },
  OUT: { label: "Out of Stock", color: "error" },
} as const;

export function getStockStatus(quantity: number, reorderLevel: number) {
  if (quantity === 0) return STOCK_STATUS.OUT;
  if (quantity <= reorderLevel) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}
