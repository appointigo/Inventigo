import { expenseAnalyticsService } from "@/modules/dashboard/services/expenseAnalyticsService";
import type { AnalyticsGroup, ProfitabilityResponse } from "../types";
import { salesAnalyticsService } from "./salesAnalyticsService";

const expensePeriod = (group: AnalyticsGroup) =>
  group === "day" ? "daily" : group === "week" ? "weekly" : group === "year" ? "yearly" : "monthly";
const round = (value: number) => Number(value.toFixed(2));

export const profitabilityAnalyticsService = {
  async getAnalytics(
    orgId: string,
    storeId: string,
    from: Date,
    to: Date,
    group: AnalyticsGroup,
  ): Promise<ProfitabilityResponse> {
    const [sales, expenses] = await Promise.all([
      salesAnalyticsService.getAnalytics(orgId, storeId, from, to, group),
      expenseAnalyticsService.getAnalytics(orgId, storeId, {
        period: expensePeriod(group),
        startDate: from,
        endDate: to,
      }),
    ]);
    const expensesByPeriod = new Map(expenses.trend.map((row) => [row.period, row.amount]));
    const trend = sales.trend.map((row) => {
      const operatingExpenses = Number(expensesByPeriod.get(row.period) ?? 0);
      return {
        ...row,
        operatingExpenses,
        netProfit: row.grossProfit === null ? null : round(row.grossProfit - operatingExpenses),
      };
    });
    const operatingExpenses = Number(expenses.summary.totalExpense);
    const grossProfit = sales.summary.grossProfit;
    const netProfit = grossProfit === null ? null : round(grossProfit - operatingExpenses);
    const revenue = sales.summary.revenue;
    return {
      ...sales,
      summary: {
        ...sales.summary,
        operatingExpenses,
        netProfit,
        grossMarginPct:
          grossProfit !== null && revenue !== 0 ? round((grossProfit / revenue) * 100) : null,
        netMarginPct: netProfit !== null && revenue !== 0 ? round((netProfit / revenue) * 100) : null,
        breakEvenRevenue:
          sales.summary.cogs === null ? null : round(sales.summary.cogs + operatingExpenses),
      },
      trend,
    };
  },
};
