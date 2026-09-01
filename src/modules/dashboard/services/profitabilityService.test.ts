import test = require("node:test");
import assert = require("node:assert/strict");
import { calculateProfitabilityMetrics } from "./profitabilityService";

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
