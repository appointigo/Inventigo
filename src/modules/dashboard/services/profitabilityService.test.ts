import test from "node:test";
import assert from "node:assert/strict";
import { calculateProfitabilityMetrics } from "./profitabilityService.ts";

test("calculates gross profit, net profit, margins, and break-even from revenue, COGS, and expenses", () => {
  const metrics = calculateProfitabilityMetrics({
    revenue: 90659,
    grossProfit: 42041,
    operatingExpenses: 50870,
    revenueGrowthPct: 12.4,
  });

  assert.equal(metrics.cogs, 48618);
  assert.equal(metrics.netProfit, -8829);
  assert.equal(metrics.grossMarginPct, 46.4);
  assert.equal(metrics.netProfitMarginPct, -9.7);
  assert.equal(metrics.expenseRatioPct, 56.1);
  assert.equal(metrics.profitToExpenseRatio, -0.17);
  assert.equal(metrics.breakEvenRevenue, 99488);
  assert.equal(metrics.businessHealthStatus, "Needs Attention");
});

test("business health rewards growth and penalizes increasingly large declines", () => {
  const score = (revenueGrowthPct: number) => calculateProfitabilityMetrics({
    revenue: 100_000,
    grossProfit: 45_000,
    operatingExpenses: 20_000,
    revenueGrowthPct,
  }).businessHealthScore;

  assert.ok(score(20) > score(5));
  assert.ok(score(5) > score(0));
  assert.ok(score(0) > score(-5));
  assert.ok(score(-5) > score(-20));
});
