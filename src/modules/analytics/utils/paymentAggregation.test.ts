import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePaymentEntries } from "./paymentAggregation.ts";

test("split payments contribute one entry to each actual method", () => {
  const result = aggregatePaymentEntries([
    { method: "CASH", amount: 400 },
    { method: "CARD", amount: 600 },
  ]);
  assert.equal(result.totalReceived, 1_000);
  assert.deepEqual(
    result.methods.map((row) => [row.name, row.value, row.count]),
    [
      ["Cash", 400, 1],
      ["Card", 600, 1],
    ]
  );
});

test("empty payment data returns an empty distribution", () => {
  assert.deepEqual(aggregatePaymentEntries([]), {
    methods: [],
    totalReceived: 0,
    refundsPaid: 0,
    netCustomerMovement: 0,
  });
});

test("refund payments do not reduce gross collections or chart shares", () => {
  const result = aggregatePaymentEntries([
    { method: "CASH", amount: 1000 },
    { method: "CASH", amount: -250 },
  ]);
  assert.equal(result.totalReceived, 1000);
  assert.equal(result.refundsPaid, 250);
  assert.equal(result.netCustomerMovement, 750);
  assert.equal(result.methods[0].value, 1000);
});
