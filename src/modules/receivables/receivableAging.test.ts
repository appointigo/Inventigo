import test from "node:test";
import assert from "node:assert/strict";
import { ageSinceSale, canonicalOutstanding, receivableBucket } from "./receivableAging.ts";
test("aging buckets use age since sale", () => {
  assert.equal(receivableBucket(0), "0–7 days");
  assert.equal(receivableBucket(8), "8–30 days");
  assert.equal(receivableBucket(31), "31–60 days");
  assert.equal(receivableBucket(61), "61–90 days");
  assert.equal(receivableBucket(91), "90+ days");
});
test("age never becomes negative", () =>
  assert.equal(ageSinceSale(new Date("2026-10-07"), new Date("2026-10-06")), 0));
test("canonical outstanding trusts maintained amountDue for partial and subsequent collections", () => {
  assert.equal(canonicalOutstanding({ amountDue: 400, total: 1000, amountPaid: 600 }), 400);
  assert.equal(canonicalOutstanding({ amountDue: 0, total: 1000, amountPaid: 1000 }), 0);
});
