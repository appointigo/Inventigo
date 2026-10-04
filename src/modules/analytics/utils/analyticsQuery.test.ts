import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsQueryError, parseAnalyticsQuery } from "./analyticsQuery.ts";

test("parses analytics dates as complete Stokiva business days", () => {
  const parsed = parseAnalyticsQuery(new URLSearchParams({
    from: "2025-12-28", to: "2026-01-05", group: "day",
  }));
  assert.equal(parsed.from.toISOString(), "2025-12-27T18:30:00.000Z");
  assert.equal(parsed.to.toISOString(), "2026-01-04T18:30:00.000Z");
});

test("rejects invalid and reversed analytics dates", () => {
  assert.throws(() => parseAnalyticsQuery(new URLSearchParams({
    from: "2026-02-30", to: "2026-03-01", group: "day",
  })), AnalyticsQueryError);
  assert.throws(() => parseAnalyticsQuery(new URLSearchParams({
    from: "2026-03-02", to: "2026-03-01", group: "day",
  })), AnalyticsQueryError);
});
