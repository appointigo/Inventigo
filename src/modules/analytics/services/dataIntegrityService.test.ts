import test from "node:test";
import assert from "node:assert/strict";
import { summarizeIntegrity, type IntegritySeverity } from "../utils/integritySummary.ts";

const issue = (count: number, severity: IntegritySeverity) => ({ count, severity });

test("integrity summary distinguishes healthy, review, and action required", () => {
  assert.equal(summarizeIntegrity([], 0, 0).status, "HEALTHY");
  assert.equal(summarizeIntegrity([issue(1, "warning")], 9, 10).status, "REVIEW");
  assert.equal(summarizeIntegrity([issue(1, "error")], 8, 10).status, "ACTION_REQUIRED");
  assert.equal(summarizeIntegrity([], 8, 10).completenessPercentage, 80);
});
