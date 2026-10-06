import test from "node:test";
import assert from "node:assert/strict";
import {
  buildForecast,
  customerReturnSignal,
  errorMetrics,
  forecastAtCutoff,
  forecastAwareRequirement,
  forecastProtectedTransfer,
  forecastStockout,
  supplierDeliveryRisk,
  validateCustomerReturnSignals,
  type DailyDemand,
} from "./forecastRules.ts";

const series = (values: number[], options: Partial<DailyDemand> = {}): DailyDemand[] =>
  values.map((netUnits, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    netUnits,
    transactions: netUnits > 0 ? 1 : 0,
    inStock: true,
    ...options,
  }));

test("stable history produces bounded, non-negative forecasts", () => {
  const result = buildForecast(
    series(Array.from({ length: 90 }, (_, i) => [10, 12, 11, 13, 12][i % 5])),
    30,
    true
  );
  assert.equal(result.readiness.readiness, "READY");
  assert.equal(result.trend, "STABLE");
  assert.ok(
    result.forecast &&
      result.forecast.lower <= result.forecast.expected &&
      result.forecast.expected <= result.forecast.upper
  );
});

test("rising and declining demand produce transparent trend signals", () => {
  assert.equal(
    buildForecast(series([...Array(60).fill(5), ...Array(14).fill(10)]), 7, true).trend,
    "ACCELERATING"
  );
  assert.equal(
    buildForecast(series([...Array(60).fill(20), ...Array(14).fill(7)]), 7, true).trend,
    "DECLINING"
  );
});

test("sparse demand is not given a precise forecast", () => {
  const result = buildForecast(series([0, 1, 0, 0, 1]), 7, true);
  assert.equal(result.readiness.readiness, "NOT_READY");
  assert.equal(result.forecast, null);
});

test("stockout zero days are censored and demand pressure remains disclosed", () => {
  const rows = series(Array(60).fill(2));
  rows.push(
    ...series(Array(10).fill(0)).map((row, index) => ({
      ...row,
      date: new Date(Date.UTC(2026, 2, index + 2)).toISOString().slice(0, 10),
      inStock: false,
      unfulfilledDemand: 1,
    }))
  );
  const result = buildForecast(rows, 7, true);
  assert.ok(result.forecast && result.forecast.expected > 0);
  assert.equal(result.evidence?.stockoutDays, 10);
  assert.equal(result.evidence?.demandPressure, 10);
});

test("significant stockout history blocks a precise forecast", () => {
  const rows = series(Array(90).fill(3));
  for (let index = 60; index < rows.length; index += 1) rows[index].inStock = false;
  const result = buildForecast(rows, 30, true);
  assert.equal(result.readiness.readiness, "NOT_READY");
  assert.equal(result.forecast, null);
  assert.equal(result.readiness.significantStockouts, true);
});

test("backtesting never uses observations after its cutoff", () => {
  const base = series(Array(70).fill(3));
  const changedFuture = [
    ...base.slice(0, 63),
    ...series(Array(7).fill(100)).map((row, index) => ({ ...row, date: base[63 + index].date })),
  ];
  assert.equal(
    forecastAtCutoff(base, base[62].date, 7, "MOVING_AVERAGE"),
    forecastAtCutoff(changedFuture, base[62].date, 7, "MOVING_AVERAGE")
  );
});

test("rolling backtests select the clearly superior seasonal baseline", () => {
  const weekly = Array.from({ length: 210 }, (_, index) => {
    const day = new Date(Date.UTC(2026, 0, index + 1)).getUTCDay();
    return day === 0 || day === 6 ? 14 : 2;
  });
  const result = buildForecast(series(weekly), 30, true);
  assert.equal(result.forecast?.method, "SEASONAL_NAIVE");
  assert.equal(result.evidence.seasonality, "WEEKEND_HEAVY");
  assert.equal(result.forecast?.metrics.wape, 0);
});

test("error metrics calculate MAE, WAPE and signed bias", () => {
  assert.deepEqual(errorMetrics([10, 20], [12, 16]), { samples: 2, mae: 3, wape: 20, bias: -6.7 });
});

test("forecast-aware replenishment uses good evidence and falls back on low evidence", () => {
  assert.equal(
    forecastAwareRequirement({
      deterministicQuantity: 8,
      currentStock: 2,
      usefulInbound: 0,
      safetyStock: 3,
      leadTimeDays: 10,
      forecast30: { expected: 30, upper: 42, evidence: "HIGH" },
    }).source,
    "FORECAST_ADJUSTED"
  );
  assert.deepEqual(
    forecastAwareRequirement({
      deterministicQuantity: 8,
      currentStock: 2,
      usefulInbound: 0,
      safetyStock: 3,
      leadTimeDays: 10,
      forecast30: { expected: 30, upper: 42, evidence: "LOW" },
    }),
    { quantity: 8, source: "DETERMINISTIC_FALLBACK" }
  );
});

test("stockout risk uses demand range and useful inbound", () => {
  const result = forecastStockout({
    currentStock: 12,
    usefulInbound: 5,
    transferInbound: 0,
    forecast: { expected: 34, lower: 27, upper: 42, horizonDays: 30 },
  });
  assert.equal(result.risk, "CRITICAL");
  assert.equal(result.shortageUnits, 17);
});

test("forecast-aware transfer protects source upper demand", () => {
  assert.deepEqual(
    forecastProtectedTransfer({
      sourceStock: 47,
      sourceUpperDemand: 10,
      destinationStock: 6,
      destinationUpperDemand: 35,
      safetyBuffer: 3,
    }),
    { protectedSource: 13, transferable: 34, destinationNeed: 32, quantity: 32 }
  );
});

test("customer cadence distinguishes overdue return from sparse history", () => {
  assert.equal(customerReturnSignal(["2026-01-01"], "2026-04-01").status, "INSUFFICIENT_HISTORY");
  const result = customerReturnSignal(
    ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"],
    "2026-05-01"
  );
  assert.equal(result.status, "RETURN_DUE");
  assert.equal(result.typicalIntervalDays, 28);
});

test("customer return signal exposes historical validation windows", () => {
  const result = validateCustomerReturnSignals([
    "2026-01-01",
    "2026-01-29",
    "2026-02-26",
    "2026-03-30",
    "2026-04-28",
    "2026-05-29",
  ]);
  assert.ok(result.samples >= 3);
  assert.ok(result.returnedWithin30Days !== null);
});

test("supplier risk distinguishes stable, volatile and overdue evidence", () => {
  assert.equal(
    supplierDeliveryRisk({
      leadTimes: [8, 9, 10, 9],
      orderedAt: "2026-10-01",
      expectedDate: "2026-10-20",
      asOf: "2026-10-06",
    }).status,
    "ON_TRACK"
  );
  assert.equal(
    supplierDeliveryRisk({
      leadTimes: [2, 9, 18, 25],
      orderedAt: "2026-10-01",
      expectedDate: "2026-10-08",
      asOf: "2026-10-06",
    }).status,
    "AT_RISK"
  );
  assert.equal(
    supplierDeliveryRisk({
      leadTimes: [8, 9, 10],
      orderedAt: "2026-09-20",
      expectedDate: "2026-10-05",
      asOf: "2026-10-06",
    }).status,
    "OVERDUE"
  );
});
