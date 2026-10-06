import dayjs from "dayjs";
import { prisma } from "@/lib/db";
import {
  analyticsBucketKey,
  businessDateEndExclusive,
  businessDateForInstant,
} from "@/modules/analytics/utils/dateRange";
import { roundMoney, sumMoney } from "@/modules/analytics/utils/canonicalMetrics";
import type { ExpenseAnalyticsResponse } from "../types";

const validPeriods = new Set(["daily", "weekly", "monthly", "yearly"]);

type AnalyticsOptions = {
  period?: string;
  startDate?: Date;
  endDate?: Date;
};

const normalizePeriod = (period?: string) => {
  const value = (period ?? "monthly").toLowerCase();
  return validPeriods.has(value) ? value : "monthly";
};

const buildDateFilter = (startDate?: Date, endDate?: Date) => {
  const where: Record<string, unknown> = { status: "APPROVED" };

  if (startDate || endDate) {
    where.date = {} as Record<string, Date>;
    if (startDate) {
      (where.date as Record<string, Date>).gte = startDate;
    }
    if (endDate) {
      const endExclusive = businessDateEndExclusive(businessDateForInstant(endDate));
      (where.date as Record<string, Date>).lt = endExclusive;
    }
  }

  return where;
};

const buildTrendLabel = (period: string, value: string) => {
  const date = dayjs(value);
  if (period === "daily") {
    return date.format("DD MMM");
  }
  if (period === "weekly") {
    return `${date.format("DD MMM")} – ${date.add(6, "day").format("DD MMM")}`;
  }
  if (period === "yearly") {
    return date.format("YYYY");
  }
  return date.format("MMM YYYY");
};

export const expenseAnalyticsService = {
  async getAnalytics(
    orgId: string,
    storeId: string,
    options: AnalyticsOptions = {}
  ): Promise<ExpenseAnalyticsResponse> {
    const period = normalizePeriod(options.period);
    const where = buildDateFilter(options.startDate, options.endDate);

    const rows = await prisma.storeExpense.findMany({
      where: {
        orgId,
        storeId,
        ...where,
      },
      select: {
        category: true,
        amount: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    const totals = sumMoney(rows.map((row) => row.amount));
    const trendMap = new Map<string, number>();
    const breakdownMap = new Map<string, number>();

    rows.forEach((row) => {
      const amount = Number(row.amount ?? 0);
      const category = row.category || "Uncategorized";
      breakdownMap.set(category, (breakdownMap.get(category) ?? 0) + amount);

      const dateValue = row.date instanceof Date ? row.date : new Date(row.date);
      const group =
        period === "daily"
          ? "day"
          : period === "weekly"
            ? "week"
            : period === "yearly"
              ? "year"
              : "month";
      const key = analyticsBucketKey(dateValue, group);

      trendMap.set(key, (trendMap.get(key) ?? 0) + amount);
    });

    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        return {
          label: buildTrendLabel(period, key),
          amount: roundMoney(amount),
          period: key,
        };
      });

    const breakdown = Array.from(breakdownMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: roundMoney(amount),
        percentage: totals > 0 ? Math.round((amount / totals) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalExpense: totals,
        averageExpense: rows.length > 0 ? roundMoney(totals / rows.length) : 0,
        transactionCount: rows.length,
      },
      trend,
      breakdown,
    };
  },
};
