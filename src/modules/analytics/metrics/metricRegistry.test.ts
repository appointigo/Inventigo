import test from "node:test";
import assert from "node:assert/strict";
import { metricRegistry } from "./metricRegistry.ts";

test("canonical financial metrics declare their sources and completeness requirements", () => {
  assert.match(metricRegistry.revenue.definition, /signed adjustment/);
  assert.match(metricRegistry.collections.definition, /not new revenue/);
  assert.match(metricRegistry.refundLiability.definition, /not yet settled/);
  assert.match(metricRegistry.cogs.source, /newCostPrice/);
  assert.deepEqual(metricRegistry.grossProfit.requires, ["completeCogs"]);
  assert.deepEqual(metricRegistry.netProfit.requires, ["completeCogs", "approvedExpenses"]);
  assert.match(metricRegistry.averageOrderValue.definition, /completed sale invoice count/);
  assert.match(metricRegistry.inventoryValue.definition, /max\(0/);
});
