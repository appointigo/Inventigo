import type { DecisionInsight } from "@/modules/decision-intelligence/types";

export const PRODUCT_DECISION_THRESHOLDS = {
  reorderCoverDays: 14,
  overstockCoverDays: 120,
  slowMovingDays: 60,
  deadStockDays: 180,
  highReturnRate: 15,
  highDiscountRate: 25,
  healthyMarginPercent: 25,
  healthySellThrough: 35,
} as const;

export type ProductDecisionInput = {
  productId: string;
  unitsSold: number;
  revenue: number;
  grossMarginPercent: number | null;
  currentStock: number;
  stockCoverDays: number | null;
  sellThrough: number | null;
  daysSinceSale: number | null;
  unfulfilledDemand: number | null;
  returnRate: number;
  discountRate: number;
  inboundQuantity?: number;
  inboundExpectedDate?: string | null;
  inboundOverdue?: boolean;
};

export type ProductDecisionType =
  | "INBOUND_STOCK"
  | "REORDER"
  | "DEMAND_GAP"
  | "DEAD_STOCK"
  | "SLOW_MOVING"
  | "OVERSTOCK"
  | "MARGIN_LEAKAGE"
  | "HIGH_RETURN"
  | "HIGH_PERFORMER"
  | "MONITOR";

const n = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);

export function deriveProductDecision(
  input: ProductDecisionInput
): DecisionInsight<ProductDecisionType> {
  const t = PRODUCT_DECISION_THRESHOLDS;
  const base = { entityType: "PRODUCT" as const, entityId: input.productId };
  const shortage = Math.max(1, input.unitsSold - input.currentStock);
  if ((input.currentStock <= 2 || (input.stockCoverDays !== null && input.stockCoverDays <= t.reorderCoverDays)) && (input.inboundQuantity ?? 0) >= shortage && !input.inboundOverdue)
    return { ...base, type: "INBOUND_STOCK", severity: "LOW", title: "Inbound stock", reasons: [`${n(input.inboundQuantity ?? 0)} units already on order`, input.inboundExpectedDate ? `Expected ${input.inboundExpectedDate}` : "Expected date not recorded", `${n(input.currentStock)} units currently in stock`] };
  if ((input.unfulfilledDemand ?? 0) > 0 && input.currentStock <= 2)
    return {
      ...base,
      type: "DEMAND_GAP",
      severity: "HIGH",
      title: "Restock demand gap",
      reasons: [
        `${n(input.unfulfilledDemand ?? 0)} unfulfilled requested units`,
        `${n(input.currentStock)} units currently in stock`,
      ],
    };
  if (
    input.unitsSold > 0 &&
    (input.currentStock <= 0 ||
      (input.stockCoverDays !== null && input.stockCoverDays <= t.reorderCoverDays))
  )
    return {
      ...base,
      type: "REORDER",
      severity: input.currentStock <= 0 ? "HIGH" : "MEDIUM",
      title: "Reorder recommended",
      reasons: [
        input.stockCoverDays === null
          ? "Stock is exhausted"
          : `${n(input.stockCoverDays)} days of stock cover`,
        `${n(input.unitsSold)} net units sold in the selected period`,
        ...((input.unfulfilledDemand ?? 0) > 0
          ? [`${n(input.unfulfilledDemand ?? 0)} unfulfilled requested units`]
          : []),
      ],
    };
  if (
    input.currentStock > 0 &&
    (input.daysSinceSale === null || input.daysSinceSale >= t.deadStockDays)
  )
    return {
      ...base,
      type: "DEAD_STOCK",
      severity: "HIGH",
      title: "Stop or reduce buying",
      reasons: [
        input.daysSinceSale === null
          ? "No recorded sale"
          : `No sale for ${input.daysSinceSale} days`,
        `${n(input.currentStock)} units remain in stock`,
      ],
    };
  if (input.currentStock > 0 && (input.daysSinceSale ?? 0) >= t.slowMovingDays)
    return {
      ...base,
      type: "SLOW_MOVING",
      severity: "MEDIUM",
      title: "Review slow-moving stock",
      reasons: [
        `Last sale was ${input.daysSinceSale} days ago`,
        `${n(input.currentStock)} units remain in stock`,
      ],
    };
  if (input.stockCoverDays !== null && input.stockCoverDays >= t.overstockCoverDays)
    return {
      ...base,
      type: "OVERSTOCK",
      severity: "MEDIUM",
      title: "Reduce future buying",
      reasons: [
        `${n(input.stockCoverDays)} days of stock cover`,
        `Only ${n(input.unitsSold)} net units sold in the selected period`,
      ],
    };
  if (input.returnRate >= t.highReturnRate)
    return {
      ...base,
      type: "HIGH_RETURN",
      severity: "MEDIUM",
      title: "Investigate returns",
      reasons: [
        `${n(input.returnRate)}% of sold units were returned`,
        `${n(input.unitsSold)} net units sold in the selected period`,
      ],
    };
  if (
    (input.grossMarginPercent !== null && input.grossMarginPercent < t.healthyMarginPercent) ||
    input.discountRate >= t.highDiscountRate
  )
    return {
      ...base,
      type: "MARGIN_LEAKAGE",
      severity: "MEDIUM",
      title: "Review margin leakage",
      reasons: [
        ...(input.grossMarginPercent === null
          ? []
          : [`${n(input.grossMarginPercent)}% gross margin`]),
        `${n(input.discountRate)}% of gross line value was discounted`,
      ],
    };
  if (
    input.revenue > 0 &&
    (input.grossMarginPercent ?? -Infinity) >= t.healthyMarginPercent &&
    (input.sellThrough ?? 0) >= t.healthySellThrough
  )
    return {
      ...base,
      type: "HIGH_PERFORMER",
      severity: "LOW",
      title: "Maintain availability",
      reasons: [
        `${n(input.grossMarginPercent ?? 0)}% gross margin`,
        `${n(input.sellThrough ?? 0)}% sell-through`,
      ],
    };
  return {
    ...base,
    type: "MONITOR",
    severity: "LOW",
    title: "Monitor",
    reasons: [
      input.unitsSold > 0
        ? `${n(input.unitsSold)} net units sold in the selected period`
        : "No material decision signal in the selected period",
    ],
  };
}
