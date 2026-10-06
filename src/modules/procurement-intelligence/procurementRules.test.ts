import assert from "node:assert/strict";
import test from "node:test";
import { businessDaysBetween, costChange, deliveryTiming, fillRate, inboundDecision, outstandingQuantity, purchaseOrderLineState, purchaseOrderStatus, validateReceiptQuantity } from "./procurementRules.ts";

test("partial receipts progress 40, 55, 5 without premature completion", () => {
  assert.equal(outstandingQuantity(100, 40), 60);
  assert.equal(purchaseOrderStatus([{ ordered: 100, accepted: 40 }]), "PARTIALLY_RECEIVED");
  assert.equal(outstandingQuantity(100, 95), 5);
  assert.equal(purchaseOrderStatus([{ ordered: 100, accepted: 100 }]), "RECEIVED");
});
test("accepted, rejected and damaged must reconcile and only accepted is fulfilled", () => {
  assert.doesNotThrow(() => validateReceiptQuantity({ received: 20, accepted: 17, rejected: 2, damaged: 1 }));
  assert.throws(() => validateReceiptQuantity({ received: 20, accepted: 20, rejected: 2, damaged: 1 }));
  assert.equal(outstandingQuantity(20, 17), 3);
});
test("line states cover none, partial, full and over receipts", () => {
  assert.deepEqual([purchaseOrderLineState(10, 0), purchaseOrderLineState(10, 4), purchaseOrderLineState(10, 10), purchaseOrderLineState(10, 11)], ["NOT_RECEIVED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "OVER_RECEIVED"]);
  assert.equal(fillRate(10, 11), 110);
});
test("delivery timing handles before, same day, late and missing expected dates", () => {
  const expected = new Date("2026-10-10T18:30:00Z");
  assert.equal(deliveryTiming(expected, new Date("2026-10-10T10:00:00Z")).onTime, true);
  assert.equal(deliveryTiming(expected, new Date("2026-10-11T18:30:00Z")).delayDays, 1);
  assert.equal(deliveryTiming(null, new Date()).onTime, null);
  assert.equal(businessDaysBetween(new Date("2026-10-05T18:29:00Z"), new Date("2026-10-05T18:31:00Z")), 1);
});
test("cost trend and inbound decisions remain transparent", () => {
  assert.equal(costChange(620, 675), 8.9);
  assert.equal(costChange(null, 675), null);
  assert.equal(inboundDecision({ currentStock: 4, inbound: 20, requiredUnits: 15, overdue: false }), "INBOUND_STOCK");
  assert.equal(inboundDecision({ currentStock: 1, inbound: 5, requiredUnits: 15, overdue: true }), "ACTION_REQUIRED");
});
