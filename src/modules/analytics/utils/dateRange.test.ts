import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsGroupForRange,
  buildAnalyticsSearchParams,
  businessDateEndExclusive,
  businessDateForInstant,
  businessDateStart,
  businessDateStorageDate,
  parseAnalyticsDateRange,
  resolveAnalyticsDateRange,
} from "./dateRange.ts";

const now = new Date("2026-10-04T12:00:00.000Z");

test("resolves shared analytics presets in the Stokiva business timezone", () => {
  assert.deepEqual(resolveAnalyticsDateRange("today", null, now), {
    preset: "today", from: "2026-10-04", to: "2026-10-04", group: "day",
  });
  assert.equal(resolveAnalyticsDateRange("7d", null, now).from, "2026-09-28");
  assert.equal(resolveAnalyticsDateRange("30d", null, now).from, "2026-09-05");
  assert.equal(resolveAnalyticsDateRange("thisMonth", null, now).from, "2026-10-01");
});

test("supports single-day, partial-month, cross-month and cross-year custom ranges", () => {
  const ranges = [
    ["2026-09-15", "2026-09-15", "day"],
    ["2026-09-01", "2026-09-07", "day"],
    ["2026-08-15", "2026-09-17", "week"],
    ["2025-12-28", "2026-01-05", "day"],
  ] as const;
  for (const [from, to, group] of ranges) {
    assert.deepEqual(resolveAnalyticsDateRange("custom", { from, to }, now), {
      preset: "custom", from, to, group,
    });
  }
});

test("rejects reversed custom ranges and chooses readable long-range buckets", () => {
  assert.throws(() => resolveAnalyticsDateRange("custom", {
    from: "2026-09-10", to: "2026-09-01",
  }, now));
  assert.equal(analyticsGroupForRange("2026-01-01", "2026-12-31"), "month");
});

test("falls back safely when URL custom dates are incomplete", () => {
  const params = new URLSearchParams({ period: "custom", from: "2026-09-01" });
  assert.equal(parseAnalyticsDateRange(params, "30d", now).preset, "30d");
});

test("converts complete business days to explicit IST boundaries", () => {
  assert.equal(businessDateStart("2026-10-04").toISOString(), "2026-10-03T18:30:00.000Z");
  assert.equal(businessDateEndExclusive("2026-10-04").toISOString(), "2026-10-04T18:30:00.000Z");
  assert.equal(businessDateStorageDate("2026-10-04").toISOString(), "2026-10-04T00:00:00.000Z");
  assert.equal(businessDateForInstant(new Date("2026-12-31T18:29:59.999Z")), "2026-12-31");
  assert.equal(businessDateForInstant(new Date("2026-12-31T18:30:00.000Z")), "2027-01-01");
  assert.equal(businessDateForInstant(new Date("2026-12-31T18:31:00.000Z")), "2027-01-01");
});

test("combines the selected store and custom date range in analytics requests", () => {
  const params = buildAnalyticsSearchParams({
    storeId: "store-a",
    from: "2026-09-01",
    to: "2026-09-30",
    group: "day",
  });
  assert.equal(params.get("storeId"), "store-a");
  assert.equal(params.get("from"), "2026-09-01");
  assert.equal(params.get("to"), "2026-09-30");
  assert.equal(params.get("group"), "day");
});
