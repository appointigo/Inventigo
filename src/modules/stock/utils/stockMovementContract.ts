import type { StockMovementType } from "@prisma/client";

export type StockAdjustmentOperation = "ADD" | "REMOVE" | "SET";

export function resolveStockDelta(input: {
  type: StockMovementType;
  quantity: number;
  quantityBefore: number;
  operation?: StockAdjustmentOperation;
}) {
  const { type, quantity, quantityBefore, operation } = input;
  if (!Number.isSafeInteger(quantity)) throw new Error("Stock quantity must be a whole number");

  if (operation === "SET") return quantity - quantityBefore;
  if (operation === "ADD") return Math.abs(quantity);
  if (operation === "REMOVE") return -Math.abs(quantity);
  if (type === "IN" || type === "RETURN" || type === "EXCHANGE_IN" || type === "TRANSFER_IN")
    return Math.abs(quantity);
  if (type === "OUT" || type === "SALE" || type === "EXCHANGE_OUT" || type === "TRANSFER_OUT")
    return -Math.abs(quantity);
  return quantity;
}

export function stockAuditSnapshot(quantityBefore: number, deltaQuantity: number) {
  const quantityAfter = quantityBefore + deltaQuantity;
  if (quantityAfter < 0) {
    throw new Error(
      `Insufficient stock. Available: ${quantityBefore}, Requested: ${Math.abs(deltaQuantity)}`
    );
  }
  return {
    quantity: Math.abs(deltaQuantity),
    deltaQuantity,
    quantityBefore,
    quantityAfter,
  };
}
