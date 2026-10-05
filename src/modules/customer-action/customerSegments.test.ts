import test from "node:test";
import assert from "node:assert/strict";
import { deriveCustomerAction, segmentCustomer } from "./customerSegments.ts";
const now = new Date("2026-10-06T00:00:00Z");
const base = {
  customerId: "c1",
  orderCount: 2,
  retainedRevenue: 5000,
  lastPurchaseAt: new Date("2026-09-20T00:00:00Z"),
  averageDaysBetweenPurchases: 30,
  discountUsageRate: 0,
  unfulfilledDemand: 0,
  restockAvailable: false,
  overdueFollowUps: 0,
  now,
};
test("new, repeat, VIP and never-purchased definitions are explicit", () => {
  assert.deepEqual(segmentCustomer({ ...base, orderCount: 1 }), ["NEW"]);
  assert.ok(segmentCustomer({ ...base, orderCount: 6 }).includes("VIP"));
  assert.deepEqual(segmentCustomer({ ...base, orderCount: 0, lastPurchaseAt: null }), [
    "NEVER_PURCHASED",
  ]);
});
test("high-value dormant customers are actionable", () => {
  const input = {
    ...base,
    retainedRevenue: 30000,
    lastPurchaseAt: new Date("2026-01-01T00:00:00Z"),
  };
  assert.ok(segmentCustomer(input).includes("HIGH_VALUE_DORMANT"));
  assert.equal(deriveCustomerAction(input).type, "HIGH_VALUE_DORMANT");
});
test("reliable restock match and overdue follow-up create separate queues", () => {
  assert.equal(
    deriveCustomerAction({ ...base, unfulfilledDemand: 2, restockAvailable: true }).type,
    "DEMAND_FOLLOW_UP"
  );
  assert.equal(
    deriveCustomerAction({
      ...base,
      overdueFollowUps: 1,
      unfulfilledDemand: 2,
      restockAvailable: true,
    }).type,
    "OVERDUE_FOLLOW_UP"
  );
});
test("repeat-due is labelled as a cadence heuristic", () => {
  const r = deriveCustomerAction({ ...base, lastPurchaseAt: new Date("2026-07-01T00:00:00Z") });
  assert.equal(r.type, "REPEAT_CUSTOMER_DUE");
  assert.match(r.reasons.join(" "), /Heuristic/);
});
