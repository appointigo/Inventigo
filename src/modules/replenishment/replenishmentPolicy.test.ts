import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateReplenishment,
  evaluateRecommendationOutcome,
  type ReplenishmentInput,
} from "./replenishmentPolicy.ts";
const base: ReplenishmentInput = {
  productId: "p",
  sizeId: "s",
  active: true,
  currentStock: 4,
  unitCost: 100,
  netUnitsSold: 30,
  activeTradingDays: 30,
  observationDays: 30,
  unfulfilledDemand: 0,
  leadTimeDays: 10,
  leadTimeSource: "SUPPLIER_PRODUCT",
  leadTimeSamples: 3,
  inbound: [],
  daysSinceSale: 1,
  productAgeDays: 200,
  grossMarginPercent: 40,
  returnRate: 0,
  stockHistoryReliable: true,
  asOfDate: "2026-10-06",
};
test("reorder quantity exposes lead demand, safety stock, target and quantity", () => {
  const result = calculateReplenishment(base);
  assert.equal(result.type, "REORDER");
  assert.equal(result.evidence.reorderPoint, 15);
  assert.equal(result.evidence.targetStock, 35);
  assert.equal(result.recommendedQuantity, 31);
  assert.equal(result.evidence.estimatedStockoutDate, "2026-10-10");
});
test("timely inbound prevents duplicate reorder", () => {
  const result = calculateReplenishment({
    ...base,
    inbound: [{ quantity: 20, expectedInDays: 3, expectedDate: "2026-10-09", overdue: false }],
  });
  assert.equal(result.type, "INBOUND_COVERS_DEMAND");
});
test("late inbound does not hide immediate stockout risk", () => {
  const result = calculateReplenishment({
    ...base,
    inbound: [{ quantity: 30, expectedInDays: 14, expectedDate: "2026-10-20", overdue: false }],
  });
  assert.equal(result.type, "STOCKOUT_RISK");
  assert.equal(result.evidence.usefulInbound, 0);
});
test("dead and extreme overstock produce no reorder", () => {
  assert.equal(
    calculateReplenishment({ ...base, currentStock: 50, netUnitsSold: 0, daysSinceSale: 200 }).type,
    "NO_REORDER"
  );
  assert.equal(calculateReplenishment({ ...base, currentStock: 250 }).type, "NO_REORDER");
});
test("markdown requires excess, observation age, value and safe margin", () => {
  const candidate = {
    ...base,
    currentStock: 70,
    netUnitsSold: 15,
    daysSinceSale: 65,
    unitCost: 500,
  };
  assert.equal(calculateReplenishment(candidate).type, "MARKDOWN_CANDIDATE");
  assert.equal(calculateReplenishment({ ...candidate, grossMarginPercent: 15 }).type, "OVERSTOCK");
  assert.equal(
    calculateReplenishment({ ...candidate, grossMarginPercent: null }).type,
    "OVERSTOCK"
  );
});
test("sparse history avoids false precision and demand pressure remains visible", () => {
  const sparse = calculateReplenishment({
    ...base,
    netUnitsSold: 1,
    activeTradingDays: 2,
    unfulfilledDemand: 5,
  });
  assert.equal(sparse.type, "MONITOR");
  assert.equal(sparse.recommendedQuantity, null);
  assert.ok(sparse.reasonCodes.includes("DEMAND_PRESSURE"));
});
test("supplier fallback degrades evidence and is disclosed", () => {
  const result = calculateReplenishment({
    ...base,
    leadTimeSource: "FALLBACK",
    leadTimeSamples: 0,
  });
  assert.equal(result.evidenceQuality, "LOW");
  assert.ok(result.reasonCodes.includes("MISSING_LEAD_TIME"));
});
test("deterministic outcome evaluation reports order, stockout and excess", () => {
  assert.deepEqual(
    evaluateRecommendationOutcome({
      minimumStock: 0,
      poQuantity: 20,
      endingStock: 60,
      targetStock: 30,
    }),
    { stockoutOccurred: true, orderPlaced: true, quantityOrdered: 20, excessiveEndingStock: true }
  );
});
