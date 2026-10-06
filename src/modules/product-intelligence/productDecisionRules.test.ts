import test from "node:test";
import assert from "node:assert/strict";
import { deriveProductDecision } from "./productDecisionRules.ts";
const base = {
  productId: "p1",
  unitsSold: 10,
  revenue: 10000,
  grossMarginPercent: 30,
  currentStock: 20,
  stockCoverDays: 60,
  sellThrough: 40,
  daysSinceSale: 5,
  unfulfilledDemand: 0,
  returnRate: 0,
  discountRate: 0,
  inboundQuantity: 0,
  inboundExpectedDate: null,
  inboundOverdue: false,
};
test("reorder explains low cover and sales", () => {
  const r = deriveProductDecision({ ...base, currentStock: 2, stockCoverDays: 5 });
  assert.equal(r.type, "REORDER");
  assert.match(r.reasons.join(" "), /5 days/);
});
test("demand gap takes precedence when unfulfilled demand meets low stock", () =>
  assert.equal(
    deriveProductDecision({ ...base, currentStock: 1, unfulfilledDemand: 6 }).type,
    "DEMAND_GAP"
));
test("sufficient on-time inbound prevents a misleading duplicate reorder", () => {
  assert.equal(deriveProductDecision({ ...base, currentStock: 1, stockCoverDays: 4, inboundQuantity: 20, inboundExpectedDate: "2026-10-07" }).type, "INBOUND_STOCK");
  assert.equal(deriveProductDecision({ ...base, currentStock: 1, stockCoverDays: 4, inboundQuantity: 20, inboundOverdue: true }).type, "REORDER");
});
test("dead and slow stock use centralized inactivity thresholds", () => {
  assert.equal(
    deriveProductDecision({ ...base, unitsSold: 0, daysSinceSale: 200 }).type,
    "DEAD_STOCK"
  );
  assert.equal(
    deriveProductDecision({ ...base, unitsSold: 0, daysSinceSale: 75 }).type,
    "SLOW_MOVING"
  );
});
test("high returns and discount dependency remain observational", () => {
  assert.equal(deriveProductDecision({ ...base, returnRate: 18 }).type, "HIGH_RETURN");
  assert.equal(deriveProductDecision({ ...base, discountRate: 30 }).type, "MARGIN_LEAKAGE");
});
