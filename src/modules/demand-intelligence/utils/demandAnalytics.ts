import type { DemandPressureSignal, DemandReasonCode } from "../types";

export const DEMAND_THRESHOLDS = {
  minimumReliableRequests: 10,
  minimumPressureDemand: 5,
  criticalUnfulfilledShare: 0.5,
  lowStockUnits: 2,
  overstockUnits: 20,
} as const;

export const NON_STOCK_DEMAND_REASONS = new Set<DemandReasonCode>([
  "JUST_BROWSING",
  "CUSTOMER_CHANGED_MIND",
]);

export const roundDemand = (value: number, digits = 1) => Number(value.toFixed(digits));

export function demandFulfillmentRate(fulfilled: number, observed: number) {
  return observed > 0 ? roundDemand((fulfilled / observed) * 100) : null;
}

export function demandEvidenceLevel(requestCount: number): "none" | "early" | "reliable" {
  if (requestCount === 0) return "none";
  return requestCount < DEMAND_THRESHOLDS.minimumReliableRequests ? "early" : "reliable";
}

export function classifyDemandPressure(input: {
  observed: number;
  unfulfilled: number;
  currentStock: number;
  requestCount: number;
}): DemandPressureSignal {
  const evidence = demandEvidenceLevel(input.requestCount);
  if (evidence === "none") return "Insufficient demand data";
  if (evidence === "early") return "Early signal";
  const unfulfilledShare = input.observed > 0 ? input.unfulfilled / input.observed : 0;
  if (
    input.observed >= DEMAND_THRESHOLDS.minimumPressureDemand &&
    unfulfilledShare >= DEMAND_THRESHOLDS.criticalUnfulfilledShare &&
    input.currentStock <= DEMAND_THRESHOLDS.lowStockUnits
  ) {
    return "Critical Demand Gap";
  }
  if (
    input.observed >= DEMAND_THRESHOLDS.minimumPressureDemand &&
    input.unfulfilled > 0 &&
    input.currentStock <= DEMAND_THRESHOLDS.lowStockUnits
  ) {
    return "Replenishment Needed";
  }
  if (
    input.observed < DEMAND_THRESHOLDS.minimumPressureDemand &&
    input.currentStock >= DEMAND_THRESHOLDS.overstockUnits
  ) {
    return "Overstock Risk";
  }
  if (input.observed < DEMAND_THRESHOLDS.minimumPressureDemand) return "Low Demand";
  return "Healthy";
}

export function canonicalAttributes(attributes: Record<string, unknown>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join("/") : String(value)}`);
}

export function summarizeObservedDemand(
  requests: Array<{
    reasonCode: DemandReasonCode;
    requestedQuantity: number;
    fulfilledQuantity: number;
  }>
) {
  const included = requests.filter((request) => !NON_STOCK_DEMAND_REASONS.has(request.reasonCode));
  const observedDemand = included.reduce((sum, request) => sum + request.requestedQuantity, 0);
  const fulfilledQuantity = included.reduce((sum, request) => sum + request.fulfilledQuantity, 0);
  return {
    requestCount: included.length,
    observedDemand,
    fulfilledQuantity,
    unfulfilledQuantity: Math.max(0, observedDemand - fulfilledQuantity),
    fulfillmentRate: demandFulfillmentRate(fulfilledQuantity, observedDemand),
  };
}
