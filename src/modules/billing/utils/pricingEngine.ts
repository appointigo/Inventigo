export type PricingDiscountType = "PERCENTAGE" | "FLAT";
export type PricingTaxMode = "EXCLUSIVE" | "INCLUSIVE";

export type PricingSourceItem = {
  productId: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  eligibleForDiscount?: boolean;
  taxRate?: number;
};

export type SaleItemPricingSnapshot = {
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
  const discountPercent = clamp0(Number(options.discountPercent ?? 0));
  const totalDiscountInput = clamp0(Number(options.discountAmount ?? 0));
  const taxRate = clamp0(Number(options.taxRate ?? 0));
  const taxMode = options.taxMode ?? "EXCLUSIVE";

  const normalizedItems = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity ?? 0));
    const mrpCents = toCents(Number(item.mrp ?? item.sellingPrice ?? 0));
    const sellingPriceCents = toCents(Number(item.sellingPrice ?? 0));
    const baseLineAmountCents = sellingPriceCents * quantity;

    return {
      ...item,
      quantity,
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
  const totalTaxAmountCents = taxRate > 0
    ? taxMode === "INCLUSIVE"
      ? Math.round((taxableBaseTotalCents * taxRate) / (100 + taxRate))
      : Math.round((taxableBaseTotalCents * taxRate) / 100)
    : 0;

  const taxBasesCents = discountedLines.map((item) => item.discountedLineAmountCents);
  const taxSharesCents = taxRate > 0 ? allocateRoundedSharesCents(totalTaxAmountCents, taxBasesCents) : discountedLines.map(() => 0);

  const snapshots = discountedLines.map((item, index) => {
    const allocatedTaxCents = taxSharesCents[index] ?? 0;
    const taxableAmountCents = taxMode === "INCLUSIVE"
      ? Math.max(0, item.discountedLineAmountCents - allocatedTaxCents)
      : item.discountedLineAmountCents;
    const lineNetAmountCents = item.discountedLineAmountCents;
    const finalUnitPrice = item.quantity > 0 ? fromCents(Math.round(taxableAmountCents / item.quantity)) : 0;
    const effectiveUnitPrice = item.quantity > 0
      ? fromCents(Math.round((lineNetAmountCents + allocatedTaxCents) / item.quantity))
      : 0;

    return {
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
      finalLineAmount: fromCents(lineNetAmountCents),
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

  return {
    snapshots,
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(targetDiscountCents),
    taxableAmount: fromCents(taxableBaseTotalCents),
    taxAmount: fromCents(totalTaxAmountCents),
    total: finalTotal,
  };
}