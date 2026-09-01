export type ProfitabilityMetrics = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  grossMarginPct: number;
  netProfitMarginPct: number;
  expenseRatioPct: number;
  profitToExpenseRatio: number;
  revenueGrowthPct: number;
  businessHealthScore: number;
  businessHealthStatus: "Healthy" | "Good" | "Average" | "Needs Attention";
  breakEvenRevenue: number;
  breakEvenGap: number;
};

export type ProfitabilityInput = {
  revenue: number;
  grossProfit: number;
  operatingExpenses: number;
  revenueGrowthPct?: number;
};

export function calculateProfitabilityMetrics(input: ProfitabilityInput): ProfitabilityMetrics {
  const revenue = Number(input.revenue ?? 0);
  const grossProfit = Number(input.grossProfit ?? 0);
  const operatingExpenses = Number(input.operatingExpenses ?? 0);
  const revenueGrowthPct = Number(input.revenueGrowthPct ?? 0);

  const cogs = Math.max(0, revenue - grossProfit);
  const netProfit = grossProfit - operatingExpenses;

  const grossMarginPct = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;
  const netProfitMarginPct = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0;
  const expenseRatioPct = revenue > 0 ? Number(((operatingExpenses / revenue) * 100).toFixed(1)) : 0;
  const profitToExpenseRatio = operatingExpenses > 0 ? Number((netProfit / operatingExpenses).toFixed(2)) : 0;
  const breakEvenRevenue = cogs + operatingExpenses;
  const breakEvenGap = revenue - breakEvenRevenue;

  const growthScore = Math.max(0, Math.min(100, Math.abs(revenueGrowthPct)));
  const marginScore = Math.max(0, Math.min(100, netProfitMarginPct * 2));
  const expenseScore = Math.max(0, Math.min(100, 100 - expenseRatioPct));
  const profitToExpenseScore = operatingExpenses > 0 ? Math.max(0, Math.min(100, Math.max(0, profitToExpenseRatio) * 100)) : 0;
  const grossMarginScore = Math.max(0, Math.min(100, grossMarginPct));

  const businessHealthScore = Math.round(
    marginScore * 0.4 + profitToExpenseScore * 0.3 + growthScore * 0.2 + grossMarginScore * 0.1,
  );

  const businessHealthStatus: ProfitabilityMetrics["businessHealthStatus"] =
    businessHealthScore >= 75 ? "Healthy" : businessHealthScore >= 50 ? "Good" : businessHealthScore >= 25 ? "Average" : "Needs Attention";

  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    grossMarginPct,
    netProfitMarginPct,
    expenseRatioPct,
    profitToExpenseRatio,
    revenueGrowthPct,
    businessHealthScore,
    businessHealthStatus,
    breakEvenRevenue,
    breakEvenGap,
  };
}
