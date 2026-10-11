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

const now = new Date("2026-10-09T12:00:00.000Z");

test("resolves shared analytics presets in the Stokiva business timezone", () => {
  const expected = {
    today: ["2026-10-09", "2026-10-09", "day"],
    yesterday: ["2026-10-08", "2026-10-08", "day"],
    thisWeek: ["2026-10-05", "2026-10-09", "day"],
    lastWeek: ["2026-09-28", "2026-10-04", "day"],
    thisMonth: ["2026-10-01", "2026-10-09", "day"],
    lastMonth: ["2026-09-01", "2026-09-30", "day"],
    thisQuarter: ["2026-10-01", "2026-10-09", "week"],
    lastQuarter: ["2026-07-01", "2026-09-30", "week"],
    thisYear: ["2026-01-01", "2026-10-09", "month"],
    lastYear: ["2025-01-01", "2025-12-31", "month"],
    "7d": ["2026-10-03", "2026-10-09", "day"],
    "30d": ["2026-09-10", "2026-10-09", "day"],
  } as const;
  for (const [preset, [from, to, group]] of Object.entries(expected)) {
    assert.deepEqual(resolveAnalyticsDateRange(preset as keyof typeof expected, null, now), {
      preset, from, to, group,
    });
  }
});

test("applies page defaults only when the URL has no explicit period", () => {
  assert.deepEqual(parseAnalyticsDateRange(new URLSearchParams(), "thisMonth", now), {
    preset: "thisMonth", from: "2026-10-01", to: "2026-10-09", group: "day",
  });
  assert.deepEqual(parseAnalyticsDateRange(new URLSearchParams(), "today", now), {
    preset: "today", from: "2026-10-09", to: "2026-10-09", group: "day",
  });
  assert.equal(
    parseAnalyticsDateRange(new URLSearchParams({ period: "today" }), "thisMonth", now).preset,
    "today",
  );
  assert.equal(
    parseAnalyticsDateRange(new URLSearchParams({ period: "thisMonth" }), "today", now).preset,
    "thisMonth",
  );
  assert.deepEqual(
    parseAnalyticsDateRange(new URLSearchParams({
      period: "custom", from: "2026-10-02", to: "2026-10-06",
    }), "today", now),
    { preset: "custom", from: "2026-10-02", to: "2026-10-06", group: "day" },
  );
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

test("falls back to the page default for unsupported or malformed URL ranges", () => {
  assert.deepEqual(
    parseAnalyticsDateRange(new URLSearchParams({ period: "nextWeek" }), "today", now),
    { preset: "today", from: "2026-10-09", to: "2026-10-09", group: "day" },
  );
  assert.deepEqual(
    parseAnalyticsDateRange(new URLSearchParams({
      period: "custom", from: "2026-10-10", to: "2026-10-01",
    }), "today", now),
    { preset: "today", from: "2026-10-09", to: "2026-10-09", group: "day" },
  );
});

test("preserves exact custom dates across month and year boundaries", () => {
  assert.deepEqual(resolveAnalyticsDateRange("custom", {
    from: "2026-10-01", to: "2026-10-07",
  }, now), { preset: "custom", from: "2026-10-01", to: "2026-10-07", group: "day" });
  assert.equal(resolveAnalyticsDateRange("custom", {
    from: "2026-09-28", to: "2026-10-05",
  }, now).group, "day");
  assert.equal(resolveAnalyticsDateRange("custom", {
    from: "2025-12-28", to: "2026-01-05",
  }, now).group, "day");
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
