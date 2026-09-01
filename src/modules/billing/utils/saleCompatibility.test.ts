import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSaleCompatibility } from "./saleCompatibility";

test("reconstructs a legacy discounted paid invoice", () => {
  const sale = normalizeSaleCompatibility({
    id: "legacy",
    total: 900,
    discountAmount: 299,
    taxAmount: 0,
    amountPaid: 0,
    amountDue: 0,
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    createdAt: "2026-08-26T14:04:34.484Z",
    items: [{ quantity: 1, unitPrice: 1199, total: 1199, finalUnitPrice: 0, finalLineAmount: 0, pricingSnapshotDate: null }],
    payments: [],
  });

  assert.equal((sale.items[0] as RawNormalizedItem).finalUnitPrice, 900);
  assert.equal((sale.items[0] as RawNormalizedItem).finalLineAmount, 900);
  assert.equal((sale.items[0] as RawNormalizedItem).allocatedDiscount, 299);
  assert.equal(sale.amountPaid, 900);
  assert.equal((sale.payments[0] as { method: string }).method, "CASH");
});

test("preserves authoritative modern snapshots including legitimate zero values", () => {
  const item = { quantity: 1, unitPrice: 500, total: 500, finalUnitPrice: 0, finalLineAmount: 0, effectiveUnitPrice: 0, pricingSnapshotDate: "2026-09-01T00:00:00Z" };
  const sale = normalizeSaleCompatibility({ total: 0, discountAmount: 500, paymentStatus: "PAID", items: [item], payments: [] });
  assert.equal(sale.items[0], item);
  assert.equal(sale.items[0].finalUnitPrice, 0);
  assert.equal(sale.amountPaid, 0);
});

test("allocates legacy discounts deterministically across multiple lines", () => {
  const sale = normalizeSaleCompatibility({
    total: 225,
    discountAmount: 75,
    paymentStatus: "PAID",
    items: [
      { quantity: 1, unitPrice: 100, total: 100, pricingSnapshotDate: null },
      { quantity: 2, unitPrice: 100, total: 200, pricingSnapshotDate: null },
    ],
    payments: [],
  });
  assert.deepEqual(sale.items.map((item) => (item as unknown as RawNormalizedItem).allocatedDiscount), [25, 50]);
  assert.deepEqual(sale.items.map((item) => (item as unknown as RawNormalizedItem).finalLineAmount), [75, 150]);
});

type RawNormalizedItem = { allocatedDiscount: number; finalLineAmount: number; finalUnitPrice: number };

test("uses payment rows as the source of truth for partial payments", () => {
  const sale = normalizeSaleCompatibility({
    total: 900,
    discountAmount: 0,
    amountPaid: 1,
    amountDue: 600,
    paymentStatus: "PARTIAL",
    items: [{ quantity: 1, unitPrice: 900, total: 900, pricingSnapshotDate: "2026-09-01" }],
    payments: [{ amount: 300, method: "UPI" }],
  });
  assert.equal(sale.amountPaid, 300);
  assert.equal(sale.amountDue, 600);
});

test("legacy snapshots are independent of a product's current price", () => {
  const sale = normalizeSaleCompatibility({
    total: 900,
    discountAmount: 299,
    paymentStatus: "PAID",
    items: [{ quantity: 1, unitPrice: 1199, total: 1199, pricingSnapshotDate: null, currentProductPrice: 2499 }],
    payments: [],
  });
  assert.equal(sale.items[0].mrp, 1199);
  assert.equal(sale.items[0].finalUnitPrice, 900);
});
