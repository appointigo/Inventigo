import dayjs from "dayjs";
import type {
  AnalyticsGroup,
  FinancialEvent,
  SalesAnalyticsPoint,
  SalesAnalyticsResponse,
} from "../types";

const round = (value: number) => Number(value.toFixed(2));

export function bucketStart(date: Date, group: AnalyticsGroup) {
  const value = dayjs(date);
  if (group === "day") return value.startOf("day");
  if (group === "week") return value.startOf("week");
  if (group === "year") return value.startOf("year");
  return value.startOf("month");
}

export function bucketLabel(period: string, group: AnalyticsGroup) {
  const value = dayjs(period);
  if (group === "day") return value.format("DD MMM");
  if (group === "week") return `${value.format("DD MMM")} – ${value.add(6, "day").format("DD MMM")}`;
  if (group === "year") return value.format("YYYY");
  return value.format("MMM YYYY");
}

export function buildBucketKeys(from: Date, to: Date, group: AnalyticsGroup) {
  const keys: string[] = [];
  let cursor = bucketStart(from, group);
  const end = dayjs(to).endOf("day");
  while (!cursor.isAfter(end)) {
    keys.push(cursor.format("YYYY-MM-DD"));
    cursor = group === "day"
      ? cursor.add(1, "day")
      : group === "week"
        ? cursor.add(1, "week")
        : group === "year"
          ? cursor.add(1, "year")
          : cursor.add(1, "month");
  }
  return keys;
}

export function aggregateFinancialEvents(
  events: FinancialEvent[],
  from: Date,
  to: Date,
  group: AnalyticsGroup,
): SalesAnalyticsResponse {
  const grouped = new Map<string, FinancialEvent[]>();
  for (const event of events) {
    const key = bucketStart(event.date, group).format("YYYY-MM-DD");
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  const trend: SalesAnalyticsPoint[] = buildBucketKeys(from, to, group).map((period) => {
    const rows = grouped.get(period) ?? [];
    const revenue = round(rows.reduce((sum, row) => sum + row.revenue, 0));
    const costComplete = rows.every((row) => row.cogs !== null);
    const cogs = costComplete ? round(rows.reduce((sum, row) => sum + (row.cogs ?? 0), 0)) : null;
    return {
      period,
      label: bucketLabel(period, group),
      revenue,
      cogs,
      grossProfit: cogs === null ? null : round(revenue - cogs),
      discount: round(rows.reduce((sum, row) => sum + row.discount, 0)),
      orders: rows.reduce((sum, row) => sum + row.orderCount, 0),
      returnValue: round(rows.reduce((sum, row) => sum + row.returnValue, 0)),
      returns: rows.reduce((sum, row) => sum + row.returnCount, 0),
      exchanges: rows.reduce((sum, row) => sum + row.exchangeCount, 0),
    };
  });

  const revenue = round(trend.reduce((sum, row) => sum + row.revenue, 0));
  const cogsComplete = trend.every((row) => row.cogs !== null);
  const cogs = cogsComplete ? round(trend.reduce((sum, row) => sum + (row.cogs ?? 0), 0)) : null;
  const orders = trend.reduce((sum, row) => sum + row.orders, 0);
  const grossProfit = cogs === null ? null : round(revenue - cogs);

  return {
    range: {
      from: dayjs(from).format("YYYY-MM-DD"),
      to: dayjs(to).format("YYYY-MM-DD"),
      group,
    },
    methodology: {
      revenue: "Final billed sale totals, less returned lines, plus replacement exchange lines.",
      cogs: "Immutable cost captured on each original sale item.",
      returns: "Returns reverse historical item revenue and cost on their business date.",
      grossProfitReliable: cogsComplete,
      grossProfitNote: cogsComplete
        ? null
        : "Some replacement exchange lines do not have an immutable cost snapshot, so gross profit is unavailable for affected periods.",
    },
    summary: {
      revenue,
      cogs,
      grossProfit,
      discounts: round(trend.reduce((sum, row) => sum + row.discount, 0)),
      orders,
      averageOrderValue: orders > 0 ? round(revenue / orders) : 0,
      returnValue: round(trend.reduce((sum, row) => sum + row.returnValue, 0)),
      returns: trend.reduce((sum, row) => sum + row.returns, 0),
      exchanges: trend.reduce((sum, row) => sum + row.exchanges, 0),
    },
    trend,
  };
}
