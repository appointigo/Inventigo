export type PricingDiscountType = "PERCENTAGE" | "FLAT";
export type ItemDiscountType = "NONE" | "PRICE" | "FLAT" | "PERCENTAGE";
export type ItemPriceAdjustment = { itemDiscountType?: ItemDiscountType; itemDiscountValue?: number };

/** Fixed discounts and direct prices are per unit, before bill-wide discounts. */
export function resolveItemPrice(originalUnitPrice: number, adjustment: ItemPriceAdjustment = {}): number {
  validateAmount(originalUnitPrice, "original unit price");
  const type = adjustment.itemDiscountType ?? "NONE";
  const rawValue = adjustment.itemDiscountValue ?? 0;
  validateAmount(rawValue, "item discount/price");
  const value = roundTo2(rawValue);
  if (type !== "NONE" && typeof adjustment.itemDiscountValue !== "number") throw new Error("Invalid item discount/price");
  if (!["NONE", "PRICE", "FLAT", "PERCENTAGE"].includes(type) ||
      (type === "PERCENTAGE" && value > 100) ||
      (type === "FLAT" && value > originalUnitPrice) ||
      (type === "NONE" && value !== 0)) throw new Error("Invalid item discount/price");
  return roundTo2(type === "PRICE" ? value : type === "FLAT" ? originalUnitPrice - value :
    type === "PERCENTAGE" ? originalUnitPrice * (1 - value / 100) : originalUnitPrice);
}

export function validateAmount(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 99999999.99) {
    throw new Error(`Invalid ${name}`);
  }
}

export type PricingTaxMode = "EXCLUSIVE" | "INCLUSIVE";

export type PricingSourceItem = ItemPriceAdjustment & {
  originalUnitPrice?: number;
  productId: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  eligibleForDiscount?: boolean;
  taxRate?: number;
};

export type SaleItemPricingSnapshot = {
  originalUnitPrice: number;
  itemDiscountType: ItemDiscountType;
  itemDiscountValue: number;
  netLineAmount: number;
  productId: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discountType?: PricingDiscountType;
  appliedDiscountPercent?: number;
  allocatedDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  finalUnitPrice: number;
  finalLineAmount: number;
  effectiveUnitPrice: number;
  pricingSnapshotDate: Date;
  costPrice?: number;
  eligibleForDiscount: boolean;
};

export type PricingAllocationOptions = {
  discountType?: PricingDiscountType;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
  taxMode?: PricingTaxMode;
  pricingSnapshotDate?: Date;
};

import { toCents, fromCents, roundTo2, allocateRoundedSharesCents } from "@/shared/utils/money";

export type PricingAllocationResult = {
  snapshots: SaleItemPricingSnapshot[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

const clamp0 = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export function allocatePricingSnapshots(
  items: PricingSourceItem[],
  options: PricingAllocationOptions = {}
): PricingAllocationResult {
  const pricingSnapshotDate = options.pricingSnapshotDate ?? new Date();
  const discountType = options.discountType ?? "PERCENTAGE";
  const discountPercent = options.discountPercent ?? 0;
  validateAmount(discountPercent, "bill discount percentage");
  if (discountPercent > 100) throw new Error("Invalid bill discount percentage");
  validateAmount(options.discountAmount ?? 0, "bill discount amount");
  validateAmount(options.taxRate ?? 0, "tax rate");
  if (!["PERCENTAGE", "FLAT"].includes(discountType)) throw new Error("Invalid discount type");
  if (options.taxMode && !["EXCLUSIVE", "INCLUSIVE"].includes(options.taxMode)) throw new Error("Invalid tax mode");
  const totalDiscountInput = clamp0(Number(options.discountAmount ?? 0));
  const taxRate = clamp0(Number(options.taxRate ?? 0));
  const taxMode = options.taxMode ?? "EXCLUSIVE";

  const normalizedItems = items.map((item) => {
    const quantity = item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Invalid quantity");
    validateAmount(item.sellingPrice, "selling price");
    const originalUnitPrice = item.originalUnitPrice ?? item.sellingPrice;
    const sellingPrice = item.itemDiscountType != null
      ? resolveItemPrice(originalUnitPrice, item) : roundTo2(item.sellingPrice);
    const mrpCents = toCents(Number(item.mrp ?? item.sellingPrice ?? 0));
    const sellingPriceCents = toCents(sellingPrice);
    const baseLineAmountCents = sellingPriceCents * quantity;
    validateAmount(fromCents(baseLineAmountCents), "line total");

    return {
      ...item,
      quantity,
      originalUnitPrice,
      mrp: fromCents(mrpCents),
      sellingPrice: fromCents(sellingPriceCents),
      baseLineAmountCents,
      eligibleForDiscount: item.eligibleForDiscount !== false,
      taxRate: clamp0(Number(item.taxRate ?? taxRate)),
      costPrice: item.costPrice != null ? fromCents(toCents(Number(item.costPrice))) : undefined,
    };
  });

  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.baseLineAmountCents, 0);
  const eligibleBasesCents = normalizedItems.map((item) => (item.eligibleForDiscount ? item.baseLineAmountCents : 0));
  const eligibleSubtotalCents = eligibleBasesCents.reduce((sum, value) => sum + value, 0);

  const targetDiscountCents = discountType === "PERCENTAGE"
    ? Math.round((eligibleSubtotalCents * discountPercent) / 100)
    : Math.min(toCents(totalDiscountInput), eligibleSubtotalCents);

  const allocatedDiscounts = allocateRoundedSharesCents(targetDiscountCents, eligibleBasesCents);

  const discountedLines = normalizedItems.map((item, index) => {
    const allocatedDiscountCents = allocatedDiscounts[index] ?? 0;
    const discountedLineAmountCents = Math.max(0, item.baseLineAmountCents - allocatedDiscountCents);
    return {
      ...item,
      allocatedDiscountCents,
      discountedLineAmountCents,
    };
  });

  const taxableBaseTotalCents = discountedLines.reduce((sum, item) => sum + item.discountedLineAmountCents, 0);
  // Allocate rounding within each tax-rate group, preserving the existing bill tax rule.
  const taxSharesCents = discountedLines.map(() => 0);
  for (const rate of new Set(discountedLines.map((item) => item.taxRate))) {
    const bases = discountedLines.map((item) => item.taxRate === rate ? item.discountedLineAmountCents : 0);
    const base = bases.reduce((sum, amount) => sum + amount, 0);
    const tax = Math.round(base * rate / (taxMode === "INCLUSIVE" ? 100 + rate : 100));
    allocateRoundedSharesCents(tax, bases).forEach((amount, index) => { taxSharesCents[index] += amount; });
  }
  const totalTaxAmountCents = taxSharesCents.reduce((sum, amount) => sum + amount, 0);

  const snapshots = discountedLines.map((item, index) => {
    const allocatedTaxCents = taxSharesCents[index] ?? 0;
    const taxableAmountCents = taxMode === "INCLUSIVE"
      ? Math.max(0, item.discountedLineAmountCents - allocatedTaxCents)
      : item.discountedLineAmountCents;
    const lineNetAmountCents = taxableAmountCents + allocatedTaxCents;
    const finalUnitPrice = item.quantity > 0 ? fromCents(Math.round(taxableAmountCents / item.quantity)) : 0;
    const effectiveUnitPrice = item.quantity > 0
      ? fromCents(Math.round(lineNetAmountCents / item.quantity))
      : 0;

    return {
      originalUnitPrice: item.originalUnitPrice,
      itemDiscountType: item.itemDiscountType ?? "NONE",
      itemDiscountValue: roundTo2(item.itemDiscountValue ?? 0),
      netLineAmount: fromCents(lineNetAmountCents),
      productId: item.productId,
      quantity: item.quantity,
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      discountType,
      appliedDiscountPercent: item.baseLineAmountCents > 0
        ? roundTo2((fromCents(allocatedDiscounts[index] ?? 0) / fromCents(item.baseLineAmountCents)) * 100)
        : 0,
      allocatedDiscount: fromCents(allocatedDiscounts[index] ?? 0),
      taxableAmount: fromCents(taxableAmountCents),
      taxAmount: fromCents(allocatedTaxCents),
      finalUnitPrice,
      finalLineAmount: fromCents(taxableAmountCents),
      effectiveUnitPrice,
      pricingSnapshotDate,
      costPrice: item.costPrice,
      eligibleForDiscount: item.eligibleForDiscount,
    } satisfies SaleItemPricingSnapshot;
  });

  // In inclusive mode, total = taxableBaseTotal (tax already included)
  // In exclusive mode, total = taxableBaseTotal + tax (tax added on top)
  const finalTotal = taxMode === "INCLUSIVE"
    ? fromCents(taxableBaseTotalCents)
    : fromCents(taxableBaseTotalCents + totalTaxAmountCents);

  validateAmount(fromCents(subtotalCents), "sale subtotal");
  validateAmount(finalTotal, "sale total");
  return {
    snapshots,
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(targetDiscountCents),
    taxableAmount: fromCents(taxableBaseTotalCents),
    taxAmount: fromCents(totalTaxAmountCents),
    total: finalTotal,
  };
}