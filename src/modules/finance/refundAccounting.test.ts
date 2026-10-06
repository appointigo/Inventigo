import assert from "node:assert/strict";
import test from "node:test";
import { planRefundAccounting, refundIdempotencyKey } from "./refundAccounting.ts";

test("immediate cash refund is fully settled", () => {
  assert.deepEqual(planRefundAccounting(1000, [{ method: "CASH", amount: 1000 }]), {
    liabilityAmount: 1000,
    settledAmount: 1000,
    outstandingAmount: 0,
    status: "SETTLED",
    payments: [{ method: "CASH", amount: 1000 }],
  });
});

test("immediate card and UPI refunds retain their settlement methods", () => {
  assert.deepEqual(
    planRefundAccounting(1000, [
      { method: "CARD", amount: 400 },
      { method: "UPI", amount: 600 },
    ]).payments,
    [
      { method: "CARD", amount: 400 },
      { method: "UPI", amount: 600 },
    ]
  );
});

test("deferred refund remains an outstanding liability without money movement", () => {
  const result = planRefundAccounting(1000, []);
  assert.equal(result.status, "PENDING");
  assert.equal(result.settledAmount, 0);
  assert.equal(result.outstandingAmount, 1000);
});

test("partial immediate refund leaves only the unpaid balance outstanding", () => {
  const result = planRefundAccounting(1000, [{ method: "UPI", amount: 300 }]);
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.settledAmount, 300);
  assert.equal(result.outstandingAmount, 700);
});

test("return without refund creates no liability state", () => {
  assert.equal(planRefundAccounting(0, []).status, null);
});

test("retry keys are stable for the same request and distinct across requests", () => {
  assert.equal(refundIdempotencyKey("o", "s", "r1"), refundIdempotencyKey("o", "s", "r1"));
  assert.notEqual(refundIdempotencyKey("o", "s", "r1"), refundIdempotencyKey("o", "s", "r2"));
});
