import test from "node:test";
import assert from "node:assert/strict";
import { accountBalance, cashCoverage, customerSettlement, payableAging, payableState, refundCashImpact, refundState, splitPaymentPostings, transferNetMovement } from "./financeRules.ts";

test("actual collections, not invoice totals, determine cash", () => {
  assert.deepEqual(customerSettlement(10_000, [6_000]), { cashInflow: 6_000, receivable: 4_000 });
  assert.deepEqual(customerSettlement(10_000, [6_000, 2_000]), { cashInflow: 8_000, receivable: 2_000 });
});

test("split payments create one posting per actual account allocation", () => {
  assert.deepEqual(splitPaymentPostings([{ accountId: "cash", amount: 3_000 }, { accountId: "upi", amount: 7_000 }]), [
    { accountId: "cash", amount: 3_000, direction: "INFLOW" },
    { accountId: "upi", amount: 7_000, direction: "INFLOW" },
  ]);
});

test("cash balance uses opening plus inflows less outflows", () => {
  assert.equal(accountBalance(100_000, 30_000, 20_000), 110_000);
});

test("supplier payable supports partial payment", () => {
  assert.deepEqual(payableState(100_000, 60_000), { outstanding: 40_000, status: "PARTIALLY_PAID" });
});

test("payable aging covers due and missing-date semantics", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  assert.equal(payableAging(null, now), "DUE_DATE_MISSING");
  assert.equal(payableAging(new Date("2026-10-07"), now), "NOT_DUE");
  assert.equal(payableAging(new Date("2026-10-06"), now), "DUE_TODAY");
  assert.equal(payableAging(new Date("2026-10-01"), now), "OVERDUE_0_7");
  assert.equal(payableAging(new Date("2026-09-16"), now), "OVERDUE_8_30");
  assert.equal(payableAging(new Date("2026-08-22"), now), "OVERDUE_31_60");
  assert.equal(payableAging(new Date("2026-07-23"), now), "OVERDUE_61_90");
  assert.equal(payableAging(new Date("2026-06-08"), now), "OVERDUE_90_PLUS");
});

test("refund is a liability until settled", () => {
  assert.deepEqual(refundState(2_000, 0), { outstanding: 2_000, status: "PENDING" });
  assert.deepEqual(refundState(2_000, 2_000), { outstanding: 0, status: "SETTLED" });
  assert.deepEqual(refundCashImpact(2_000, 0), { outstanding: 2_000, status: "PENDING", cashOutflow: 0 });
  assert.deepEqual(refundCashImpact(2_000, 2_000), { outstanding: 0, status: "SETTLED", cashOutflow: 2_000 });
});

test("an idempotency key represents one posting even when submitted twice", () => {
  const ledger = new Map<string, number>();
  const post = (key: string, amount: number) => ledger.has(key) ? ledger.get(key) : ledger.set(key, amount).get(key);
  post("SALE_PAYMENT:payment-1", 6_000);
  post("SALE_PAYMENT:payment-1", 6_000);
  assert.deepEqual([...ledger.values()], [6_000]);
});

test("account transfer has zero organization movement", () => {
  assert.deepEqual(transferNetMovement(10_000), { source: -10_000, destination: 10_000, organizationNet: 0 });
});

test("cash coverage reports buffers and gaps without runway claims", () => {
  assert.deepEqual(cashCoverage(100_000, 40_000), { buffer: 60_000, gap: 0, isCovered: true });
  assert.deepEqual(cashCoverage(50_000, 80_000), { buffer: -30_000, gap: 30_000, isCovered: false });
});
