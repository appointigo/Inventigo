import type { DecisionInsight } from "@/modules/decision-intelligence/types";

export const CUSTOMER_SEGMENT_POLICY = {
  recentDays: 30,
  dormantDays: 90,
  vipMinimumOrders: 5,
  vipMinimumRevenue: 50_000,
  highValueRevenue: 25_000,
  discountDependentPercent: 50,
  cadenceGraceMultiplier: 1.25,
} as const;

export type CustomerActionInput = {
  customerId: string;
  orderCount: number;
  retainedRevenue: number;
  lastPurchaseAt: Date | null;
  averageDaysBetweenPurchases: number | null;
  discountUsageRate: number;
  unfulfilledDemand: number;
  restockAvailable: boolean;
  overdueFollowUps: number;
  now?: Date;
};

export type CustomerSegment =
  | "NEW"
  | "REPEAT"
  | "VIP"
  | "HIGH_VALUE_ACTIVE"
  | "HIGH_VALUE_DORMANT"
  | "DORMANT"
  | "DISCOUNT_DEPENDENT"
  | "DEMAND_FOLLOW_UP"
  | "NEVER_PURCHASED";
export type CustomerActionType =
  | "DEMAND_FOLLOW_UP"
  | "OVERDUE_FOLLOW_UP"
  | "HIGH_VALUE_DORMANT"
  | "REPEAT_CUSTOMER_DUE"
  | "VIP"
  | "WELCOME";

const daysSince = (date: Date | null, now: Date) =>
  date ? Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000)) : null;

export function segmentCustomer(input: CustomerActionInput): CustomerSegment[] {
  const p = CUSTOMER_SEGMENT_POLICY;
  const age = daysSince(input.lastPurchaseAt, input.now ?? new Date());
  const segments: CustomerSegment[] = [];
  if (!input.orderCount) segments.push("NEVER_PURCHASED");
  else if (input.orderCount === 1) segments.push("NEW");
  else segments.push("REPEAT");
  if (input.orderCount >= p.vipMinimumOrders || input.retainedRevenue >= p.vipMinimumRevenue)
    segments.push("VIP");
  if (input.retainedRevenue >= p.highValueRevenue)
    segments.push(
      age !== null && age >= p.dormantDays ? "HIGH_VALUE_DORMANT" : "HIGH_VALUE_ACTIVE"
    );
  else if (age !== null && age >= p.dormantDays) segments.push("DORMANT");
  if (input.discountUsageRate >= p.discountDependentPercent && input.orderCount > 0)
    segments.push("DISCOUNT_DEPENDENT");
  if (input.unfulfilledDemand > 0 && input.restockAvailable) segments.push("DEMAND_FOLLOW_UP");
  return segments;
}

export function deriveCustomerAction(
  input: CustomerActionInput
): DecisionInsight<CustomerActionType> {
  const now = input.now ?? new Date();
  const age = daysSince(input.lastPurchaseAt, now);
  const base = { entityType: "CUSTOMER" as const, entityId: input.customerId };
  if (input.overdueFollowUps > 0)
    return {
      ...base,
      type: "OVERDUE_FOLLOW_UP",
      severity: "HIGH",
      title: "Complete overdue follow-up",
      reasons: [
        `${input.overdueFollowUps} follow-up${input.overdueFollowUps === 1 ? " is" : "s are"} overdue`,
      ],
    };
  if (input.unfulfilledDemand > 0 && input.restockAvailable)
    return {
      ...base,
      type: "DEMAND_FOLLOW_UP",
      severity: "HIGH",
      title: "Requested stock is now available",
      reasons: [
        `${input.unfulfilledDemand} requested unit${input.unfulfilledDemand === 1 ? " was" : "s were"} unfulfilled`,
        "The reliably matched product or variant is currently in stock",
      ],
    };
  if (
    input.retainedRevenue >= CUSTOMER_SEGMENT_POLICY.highValueRevenue &&
    (age ?? 0) >= CUSTOMER_SEGMENT_POLICY.dormantDays
  )
    return {
      ...base,
      type: "HIGH_VALUE_DORMANT",
      severity: "HIGH",
      title: "Reconnect with high-value customer",
      reasons: [
        `No purchase for ${age} days`,
        `Historical retained value is ₹${Math.round(input.retainedRevenue).toLocaleString("en-IN")}`,
      ],
    };
  if (
    age !== null &&
    input.averageDaysBetweenPurchases !== null &&
    age > input.averageDaysBetweenPurchases * CUSTOMER_SEGMENT_POLICY.cadenceGraceMultiplier
  )
    return {
      ...base,
      type: "REPEAT_CUSTOMER_DUE",
      severity: "MEDIUM",
      title: "Repeat customer may be due",
      reasons: [
        `${age} days since last purchase`,
        `Typical interval is ${Math.round(input.averageDaysBetweenPurchases)} days`,
        "Heuristic based on the customer’s own purchase cadence",
      ],
    };
  if (
    input.orderCount >= CUSTOMER_SEGMENT_POLICY.vipMinimumOrders ||
    input.retainedRevenue >= CUSTOMER_SEGMENT_POLICY.vipMinimumRevenue
  )
    return {
      ...base,
      type: "VIP",
      severity: "LOW",
      title: "Maintain VIP relationship",
      reasons: [
        `${input.orderCount} completed orders`,
        `Historical retained value is ₹${Math.round(input.retainedRevenue).toLocaleString("en-IN")}`,
      ],
    };
  return {
    ...base,
    type: "WELCOME",
    severity: "LOW",
    title: input.orderCount ? "Keep relationship active" : "Welcome prospective customer",
    reasons: [
      input.orderCount
        ? `${input.orderCount} completed order${input.orderCount === 1 ? "" : "s"}`
        : "No completed purchase recorded",
    ],
  };
}
