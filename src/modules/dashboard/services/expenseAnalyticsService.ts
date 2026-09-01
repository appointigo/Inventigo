import dayjs from "dayjs";
import { prisma } from "@/lib/db";
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
      (where.date as Record<string, Date>).lte = endDate;
    }
  }

  return where;
};

const getTrendBucket = (period: string, value: Date) => {
  const date = dayjs(value);
  if (period === "daily") {
    return date.startOf("day").toDate();
  }
  if (period === "weekly") {
    return date.startOf("week").toDate();
  }
  if (period === "yearly") {
    return date.startOf("year").toDate();
  }
  return date.startOf("month").toDate();
};

const buildTrendLabel = (period: string, value: Date) => {
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
  async getAnalytics(orgId: string, storeId: string, options: AnalyticsOptions = {}): Promise<ExpenseAnalyticsResponse> {
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

    const totals = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const trendMap = new Map<string, number>();
    const breakdownMap = new Map<string, number>();

    rows.forEach((row) => {
      const amount = Number(row.amount ?? 0);
      const category = row.category || "Uncategorized";
      breakdownMap.set(category, (breakdownMap.get(category) ?? 0) + amount);

      const dateValue = row.date instanceof Date ? row.date : new Date(row.date);
      const bucketDate = getTrendBucket(period, dateValue);
      const key = dayjs(bucketDate).format("YYYY-MM-DD");

      trendMap.set(key, (trendMap.get(key) ?? 0) + amount);
    });

    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        const bucketDate = dayjs(key, "YYYY-MM-DD").toDate();
        return {
          label: buildTrendLabel(period, bucketDate),
          amount: Number(amount.toFixed(2)),
          period: key,
        };
      });

    const breakdown = Array.from(breakdownMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
        percentage: totals > 0 ? Math.round((amount / totals) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalExpense: Number(totals.toFixed(2)),
        averageExpense: rows.length > 0 ? Number((totals / rows.length).toFixed(2)) : 0,
        transactionCount: rows.length,
      },
      trend,
      breakdown,
    };
  },
};
