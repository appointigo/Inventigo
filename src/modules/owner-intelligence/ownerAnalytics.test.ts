import assert from "node:assert/strict";
import test from "node:test";
import { aggregateContribution, analyzeBaskets, detectLowMarginRows, tradingTime, type OwnerLineEvent } from "./ownerAnalytics.ts";

const event = (overrides: Partial<OwnerLineEvent> = {}): OwnerLineEvent => ({
  date: new Date("2026-10-05T04:30:00Z"), orderId: "sale-1", productId: "p1", product: "Shirt",
  category: "Tops", brand: "A", customerId: "c1", customer: "Mina", revenue: 100, cogs: 60,
  units: 1, discount: 10, returnValue: 0, returnUnits: 0, returnCount: 0, exchangeCount: 0, ...overrides,
});

test("contribution keeps returned revenue and COGS in the same canonical event stream", () => {
  const result = aggregateContribution([event(), event({ revenue: -25, cogs: -15, units: -1, returnValue: 25, returnUnits: 1 })], "product");
  assert.equal(result.rows[0].revenue, 75); assert.equal(result.rows[0].grossProfit, 30); assert.equal(result.rows[0].grossMargin, 40);
});

test("missing cost makes profit unavailable instead of treating cost as zero", () => {
  const result = aggregateContribution([event({ cogs: null })], "product");
  assert.equal(result.rows[0].grossProfit, null); assert.equal(result.totals.costComplete, false);
});

test("basket support, directional confidence, and lift use distinct baskets", () => {
  const result = analyzeBaskets([
    { orderId: "1", products: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "b", name: "B" }] },
    { orderId: "2", products: [{ id: "a", name: "A" }, { id: "b", name: "B" }] },
    { orderId: "3", products: [{ id: "a", name: "A" }] },
  ]);
  assert.deepEqual(result.pairs[0], { id: "a\u0000b", left: "A", right: "B", transactions: 2, support: 66.67, confidenceLeftToRight: 66.67, confidenceRightToLeft: 100, lift: 1 });
});

test("trading buckets use the configured business timezone", () => {
  const result = tradingTime([{ date: new Date("2026-10-05T20:30:00Z"), orderId: "1", revenue: 200, units: 2, cogs: 100 }]);
  assert.equal(result.hours[2].revenue, 200); assert.equal(result.weekdays[1].revenue, 200);
});

test("low margin flags are relative to category median and minimum revenue share", () => {
  const rows = detectLowMarginRows([
    { id: "1", name: "A", category: "Tops", revenue: 50, grossMargin: 10 },
    { id: "2", name: "B", category: "Tops", revenue: 50, grossMargin: 30 },
    { id: "3", name: "C", category: "Tops", revenue: 0.2, grossMargin: 1 },
  ], 100.2);
  assert.deepEqual(rows.map((row) => row.name), ["A"]);
});
