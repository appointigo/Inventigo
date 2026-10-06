import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateMoney,
  canonicalCustomerOrderValue,
  canonicalInventoryValue,
  canonicalReturnRevenueAdjustment,
  canonicalSettlementTotals,
  sumMoney,
} from "./canonicalMetrics.ts";

test("line allocation reconciles exactly to the final billed total", () => {
  const allocated = allocateMoney(100, [1, 1, 1]);
  assert.deepEqual(allocated, [33.34, 33.33, 33.33]);
  assert.equal(
    allocated.reduce((sum, value) => sum + value, 0),
    100
  );
});

test("exchange revenue is only the signed economic adjustment", () => {
  assert.equal(canonicalReturnRevenueAdjustment({ netAmount: 599, refundAmount: 0 }), 599);
  assert.equal(canonicalReturnRevenueAdjustment({ netAmount: 0, refundAmount: 599 }), -599);
  assert.equal(
    canonicalCustomerOrderValue({
      saleAmount: 1799,
      returns: [{ netAmount: 599, refundAmount: 0 }],
    }),
    2398
  );
});

test("receivable collection changes cash but never customer revenue", () => {
  assert.equal(canonicalCustomerOrderValue({ saleAmount: 5000, returns: [] }), 5000);
  assert.deepEqual(canonicalSettlementTotals([{ amount: 2000 }, { amount: 3000 }]), {
    collections: 5000,
    refundsPaid: 0,
    netCustomerMovement: 5000,
  });
});

test("collections and refunds remain separate", () => {
  assert.deepEqual(canonicalSettlementTotals([{ amount: 5000 }, { amount: -1000 }]), {
    collections: 5000,
    refundsPaid: 1000,
    netCustomerMovement: 4000,
  });
});

test("inventory value counts each variant once and excludes negative on-hand", () => {
  assert.deepEqual(
    canonicalInventoryValue([
      { quantity: 2, unitCost: 600, unitRetail: 1000 },
      { quantity: 3, unitCost: 600, unitRetail: 1000 },
      { quantity: -1, unitCost: 999, unitRetail: 1999 },
    ]),
    { units: 5, costMinor: 300000, retailMinor: 500000 }
  );
});

test("money aggregation is exact at paise precision", () => {
  assert.equal(sumMoney([0.1, 0.2, 9999.999]), 10000.3);
});
