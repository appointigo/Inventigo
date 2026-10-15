import assert from "node:assert/strict";
import test from "node:test";
import { assertRazorpayPlanMatches } from "./razorpayPlan.ts";

const price = { amountMinor: 99_900, currency: "INR", interval: "MONTH" as const, taxMode: "EXCLUSIVE" as const };
const plan = { id: "plan_test", period: "monthly", interval: 1, item: { amount: 99_900, currency: "INR", tax_inclusive: false } };

test("Razorpay plan mapping verifies amount, currency, interval and tax mode", () => {
  assert.doesNotThrow(() => assertRazorpayPlanMatches(price, plan));
  assert.throws(() => assertRazorpayPlanMatches(price, { ...plan, item: { ...plan.item, amount: 100_000 } }));
  assert.throws(() => assertRazorpayPlanMatches(price, { ...plan, period: "yearly" }));
  assert.throws(() => assertRazorpayPlanMatches(price, { ...plan, item: { ...plan.item, tax_inclusive: true } }));
});
