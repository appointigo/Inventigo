import test from "node:test";
import assert from "node:assert/strict";
import { aggregateFinancialEvents } from "./financialAggregation.ts";

const from = new Date("2026-09-01T00:00:00.000Z");
const to = new Date("2026-09-07T00:00:00.000Z");

test("nets returns and exchanges using sale-time cost events", () => {
  const result = aggregateFinancialEvents([
    { date: from, revenue: 2_000, cogs: 1_000, discount: 100, orderCount: 1, returnValue: 0, returnCount: 0, exchangeCount: 0 },
    { date: new Date("2026-09-02T00:00:00Z"), revenue: -1_000, cogs: -500, discount: 0, orderCount: 0, returnValue: 1_000, returnCount: 1, exchangeCount: 0 },
    { date: new Date("2026-09-03T00:00:00Z"), revenue: 1_200, cogs: 600, discount: 0, orderCount: 0, returnValue: 900, returnCount: 0, exchangeCount: 1 },
  ], from, to, "day");
  assert.equal(result.summary.revenue, 2_200);
  assert.equal(result.summary.cogs, 1_100);
  assert.equal(result.summary.grossProfit, 1_100);
  assert.equal(result.summary.orders, 1);
  assert.equal(result.summary.returnValue, 1_900);
  assert.equal(result.summary.returns, 1);
  assert.equal(result.summary.exchanges, 1);
});

test("marks profit unavailable when an exchange replacement lacks immutable cost", () => {
  const result = aggregateFinancialEvents([
    { date: from, revenue: 500, cogs: null, discount: 0, orderCount: 0, returnValue: 200, returnCount: 0, exchangeCount: 1 },
  ], from, to, "day");
  assert.equal(result.summary.cogs, null);
  assert.equal(result.summary.grossProfit, null);
  assert.equal(result.methodology.grossProfitReliable, false);
});

test("fills empty daily and weekly buckets with finite zeroes", () => {
  const daily = aggregateFinancialEvents([], from, to, "day");
  assert.equal(daily.trend.length, 7);
  assert.ok(daily.trend.every((row) => row.revenue === 0 && Number.isFinite(row.revenue)));
  const weekly = aggregateFinancialEvents([], from, new Date("2026-09-20T00:00:00Z"), "week");
  assert.equal(weekly.trend.length, 3);
  assert.deepEqual(weekly.trend.map((row) => row.period), [
    "2026-08-31",
    "2026-09-07",
    "2026-09-14",
  ]);
});
