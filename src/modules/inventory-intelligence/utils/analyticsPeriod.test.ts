import test from "node:test";
import assert from "node:assert/strict";
import { parseInventoryAnalyticsSearchParams, resolveAnalyticsPeriod } from "./analyticsPeriod.ts";

const now = new Date("2026-09-21T10:00:00.000Z");

test("uses Monday as the weekly boundary and compares equal elapsed time", () => {
  const period = resolveAnalyticsPeriod({
    preset: "weekly",
    comparisonMode: "previousPeriod",
    now,
  });
  assert.equal(period.current.start, "2026-09-20T18:30:00.000Z");
  assert.equal(period.current.end, now.toISOString());
  assert.equal(
    new Date(period.current.end).getTime() - new Date(period.current.start).getTime(),
    new Date(period.comparison.end).getTime() - new Date(period.comparison.start).getTime()
  );
});

test("builds period-to-date month, quarter, half-year and annual comparisons", () => {
  const expectations = {
    monthly: "2026-08-31T18:30:00.000Z",
    quarterly: "2026-06-30T18:30:00.000Z",
    halfYearly: "2026-06-30T18:30:00.000Z",
    annual: "2025-12-31T18:30:00.000Z",
  } as const;
  Object.entries(expectations).forEach(([preset, start]) => {
    const period = resolveAnalyticsPeriod({
      preset: preset as keyof typeof expectations,
      comparisonMode: "previousPeriod",
      now,
    });
    assert.equal(period.current.start, start);
    assert.equal(
      new Date(period.current.end).getTime() - new Date(period.current.start).getTime(),
      new Date(period.comparison.end).getTime() - new Date(period.comparison.start).getTime()
    );
  });
});

test("uses duration-aware granularity and human-readable inclusive labels", () => {
  const weekly = resolveAnalyticsPeriod({
    preset: "weekly",
    comparisonMode: "previousPeriod",
    now,
  });
  const monthly = resolveAnalyticsPeriod({
    preset: "monthly",
    comparisonMode: "previousPeriod",
    now,
  });
  const quarterly = resolveAnalyticsPeriod({
    preset: "quarterly",
    comparisonMode: "previousPeriod",
    now,
  });
  const halfYearly = resolveAnalyticsPeriod({
    preset: "halfYearly",
    comparisonMode: "previousPeriod",
    now: new Date("2026-06-30T18:29:59.999Z"),
  });
  const annual = resolveAnalyticsPeriod({
    preset: "annual",
    comparisonMode: "previousPeriod",
    now: new Date("2026-12-31T18:29:59.999Z"),
  });
  assert.equal(weekly.granularity, "day");
  assert.equal(monthly.granularity, "day");
  assert.equal(quarterly.granularity, "week");
  assert.equal(halfYearly.granularity, "week");
  assert.equal(annual.granularity, "month");
  assert.match(monthly.current.label, /1 Sept 2026/);
  assert.match(monthly.current.label, /21 Sept 2026/);
});

test("treats range starts as inclusive and ends as exclusive", () => {
  const period = resolveAnalyticsPeriod({
    preset: "custom",
    comparisonMode: "previousPeriod",
    customStart: new Date("2026-09-01T18:30:00.000Z"),
    customEnd: new Date("2026-09-03T18:30:00.000Z"),
  });
  assert.equal(period.current.start, "2026-09-01T18:30:00.000Z");
  assert.equal(period.current.end, "2026-09-03T18:30:00.000Z");
  assert.match(period.current.label, /2 Sept 2026/);
  assert.match(period.current.label, /3 Sept 2026/);
});

test("handles leap-year previous-year comparisons without rolling into March", () => {
  const period = resolveAnalyticsPeriod({
    preset: "custom",
    comparisonMode: "previousYear",
    customStart: new Date("2024-02-28T18:30:00.000Z"),
    customEnd: new Date("2024-03-01T18:30:00.000Z"),
    now: new Date("2024-03-01T18:30:00.000Z"),
  });
  assert.equal(period.comparison.start, "2023-02-27T18:30:00.000Z");
  assert.equal(period.comparison.end, "2023-03-01T18:30:00.000Z");
});

test("supports an explicit custom range and rejects reversed ranges", () => {
  const period = resolveAnalyticsPeriod({
    preset: "custom",
    comparisonMode: "previousPeriod",
    customStart: new Date("2026-08-01T18:30:00.000Z"),
    customEnd: new Date("2026-08-10T18:30:00.000Z"),
  });
  assert.equal(period.comparison.end, period.current.start);
  assert.throws(() =>
    resolveAnalyticsPeriod({
      preset: "custom",
      comparisonMode: "previousPeriod",
      customStart: new Date("2026-08-10T18:30:00.000Z"),
      customEnd: new Date("2026-08-01T18:30:00.000Z"),
    })
  );
});

test("validates API query parameters and requires a store", () => {
  const parsed = parseInventoryAnalyticsSearchParams(
    new URLSearchParams({ period: "monthly", compare: "previousYear", storeId: "store-a" }),
    null,
    now
  );
  assert.equal(parsed.storeId, "store-a");
  assert.equal(parsed.period.comparisonMode, "previousYear");
  assert.throws(() =>
    parseInventoryAnalyticsSearchParams(new URLSearchParams({ period: "daily" }), null, now)
  );
  assert.throws(() => parseInventoryAnalyticsSearchParams(new URLSearchParams(), null, now));
  assert.throws(() =>
    parseInventoryAnalyticsSearchParams(
      new URLSearchParams({ period: "custom", start: "bad", end: now.toISOString() }),
      "store-a",
      now
    )
  );
});
