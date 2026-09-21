import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateChange,
  calculateCorrelation,
  calculateInventoryValue,
  calculateSellThrough,
  calculateStockoutDays,
  calculateStockCover,
  classifyInventoryPerformance,
  resolveMovementDelta,
  resolveSaleLineRevenue,
  reconstructStockSnapshot,
  summarizeTransactionEvents,
} from "./metrics.ts";

test("handles zero comparisons without Infinity", () => {
  assert.deepEqual(calculateChange(10, 0), {
    absolute: 10,
    percentage: null,
    state: "new",
  });
  assert.equal(calculateChange(0, 0).percentage, 0);
});

test("calculates sell-through and stock cover with semantic nulls", () => {
  assert.equal(calculateSellThrough(30, 20, 40), 50);
  assert.equal(calculateSellThrough(0, 0, 0), null);
  assert.equal(calculateStockCover(60, 30, 15), 30);
  assert.equal(calculateStockCover(60, 0, 15), null);
});

test("uses legacy line totals when newly added pricing snapshot columns contain zero defaults", () => {
  assert.equal(resolveSaleLineRevenue(0, 0, 1115), 1115);
  assert.equal(resolveSaleLineRevenue(1090, 1080, 1115), 1090);
  assert.equal(resolveSaleLineRevenue(null, 1080, 1115), 1080);
});

test("nets sales, returns and exchanges without losing historical cost semantics", () => {
  assert.deepEqual(
    summarizeTransactionEvents([
      { revenue: 2_000, units: 2, cost: 1_000 },
      { revenue: -1_000, units: -1, cost: -500 },
      { revenue: 1_200, units: 1, cost: 600 },
    ]),
    {
      revenue: 2_200,
      units: 2,
      cogs: 1_100,
      costComplete: true,
      grossMargin: 1_100,
      averageRealizedPrice: 1_100,
    }
  );
  assert.equal(
    summarizeTransactionEvents([{ revenue: 1_200, units: 1, cost: null }]).grossMargin,
    null
  );
});

test("values only positive on-hand inventory", () => {
  assert.equal(
    calculateInventoryValue([
      { quantity: 3, unitCost: 100 },
      { quantity: -2, unitCost: 500 },
      { quantity: 4, unitCost: 25 },
    ]),
    400
  );
});

test("resolves directional movements and rejects ambiguous adjustments", () => {
  assert.equal(resolveMovementDelta("IN", 4), 4);
  assert.equal(resolveMovementDelta("RETURN", 2), 2);
  assert.equal(resolveMovementDelta("SALE", 3), -3);
  assert.equal(resolveMovementDelta("OUT", 5), -5);
  assert.equal(resolveMovementDelta("ADJUSTMENT", 5), null);
  assert.equal(calculateStockoutDays([3, 0, -1, 2]), 2);
  assert.equal(calculateStockoutDays(null), null);
});

test("reconstructs historical stock across inbound, sale, out and return movements", () => {
  const at = new Date("2026-09-01T00:00:00.000Z");
  const snapshot = reconstructStockSnapshot(
    new Map([["variant", 8]]),
    [
      { key: "variant", type: "IN", quantity: 10, date: new Date("2026-09-02T00:00:00Z") },
      { key: "variant", type: "SALE", quantity: 4, date: new Date("2026-09-03T00:00:00Z") },
      { key: "variant", type: "OUT", quantity: 1, date: new Date("2026-09-04T00:00:00Z") },
      { key: "variant", type: "RETURN", quantity: 2, date: new Date("2026-09-05T00:00:00Z") },
    ],
    at
  );
  assert.equal(snapshot?.get("variant"), 1);
  assert.equal(
    reconstructStockSnapshot(
      new Map([["variant", 8]]),
      [
        {
          key: "variant",
          type: "ADJUSTMENT",
          quantity: 3,
          date: new Date("2026-09-05T00:00:00Z"),
        },
      ],
      at
    ),
    null
  );
});

test("classifies inventory constraint, demand weakness, overstock and sparse data", () => {
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: -20,
      stockChangePct: -30,
      sellThrough: 70,
      stockCoverDays: 8,
      stockoutDays: 4,
      unitsSold: 50,
    }).classification,
    "Possible inventory constraint"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: -20,
      stockChangePct: 10,
      sellThrough: 20,
      stockCoverDays: 90,
      stockoutDays: 0,
      unitsSold: 50,
    }).classification,
    "Possible demand weakness"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: -5,
      stockChangePct: 30,
      sellThrough: 10,
      stockCoverDays: 120,
      stockoutDays: 0,
      unitsSold: 50,
    }).classification,
    "Overstock risk"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: 10,
      stockChangePct: 10,
      sellThrough: 30,
      stockCoverDays: 20,
      stockoutDays: 0,
      unitsSold: 1,
    }).classification,
    "Insufficient evidence"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: 20,
      stockChangePct: -15,
      sellThrough: 70,
      stockCoverDays: 10,
      stockoutDays: 1,
      unitsSold: 50,
    }).classification,
    "Strong demand / replenishment risk"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: 4,
      stockChangePct: 3,
      sellThrough: 40,
      stockCoverDays: 35,
      stockoutDays: 0,
      unitsSold: 50,
    }).classification,
    "Healthy"
  );
  assert.equal(
    classifyInventoryPerformance({
      salesChangePct: -20,
      stockChangePct: -20,
      sellThrough: 30,
      stockCoverDays: 40,
      stockoutDays: 0,
      unitsSold: 50,
      unavailableDemandCount: 4,
    }).strength,
    "strong"
  );
});

test("correlation requires enough non-constant observations", () => {
  assert.equal(calculateCorrelation([1, 2, 3, 4], [1, 2, 3, 4]), null);
  assert.equal(calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1);
  assert.equal(calculateCorrelation([1, 1, 1, 1, 1], [1, 2, 3, 4, 5]), null);
});
