import dayjs from "dayjs";
import type {
  AnalyticsGroup,
  FinancialEvent,
  SalesAnalyticsPoint,
  SalesAnalyticsResponse,
} from "../types";
import { dataCompleteness } from "../completeness.ts";
import type { DataCompletenessReason } from "../completeness";
import {
  addBusinessDays,
  analyticsBucketKey,
  businessDateForInstant,
  nextAnalyticsBucket,
} from "./dateRange.ts";
import { roundMoney, sumMoney } from "./canonicalMetrics.ts";

const round = roundMoney;

export function calculateReturnCostEvent(
  returnedCosts: Array<number | null>,
  replacementCosts: Array<number | null>,
  hasDetailedItems = returnedCosts.length > 0 || replacementCosts.length > 0
) {
  const reasons: DataCompletenessReason[] = [];
  if (!hasDetailedItems) reasons.push("LEGACY_RETURN_WITHOUT_ITEMS");
  if (returnedCosts.some((cost) => cost === null)) reasons.push("MISSING_SALE_ITEM_COST");
  if (replacementCosts.some((cost) => cost === null)) {
    reasons.push("MISSING_EXCHANGE_REPLACEMENT_COST");
  }
  const complete = hasDetailedItems && reasons.length === 0;
  return {
    cogs: complete
      ? round(
          replacementCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0) -
            returnedCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
        )
      : null,
    completenessReasons: reasons,
  };
}

export function bucketStart(date: Date, group: AnalyticsGroup) {
  return analyticsBucketKey(date, group);
}

export function bucketLabel(period: string, group: AnalyticsGroup) {
  const value = dayjs(period);
  if (group === "day") return value.format("DD MMM");
  if (group === "week")
    return `${value.format("DD MMM")} – ${dayjs(addBusinessDays(period, 6)).format("DD MMM")}`;
  if (group === "year") return value.format("YYYY");
  return value.format("MMM YYYY");
}

export function buildBucketKeys(from: Date, to: Date, group: AnalyticsGroup) {
  const keys: string[] = [];
  let cursor = bucketStart(from, group);
  const end = businessDateForInstant(to);
  while (cursor <= end) {
    keys.push(cursor);
    cursor = nextAnalyticsBucket(cursor, group);
  }
  return keys;
}

export function aggregateFinancialEvents(
  events: FinancialEvent[],
  from: Date,
  to: Date,
  group: AnalyticsGroup
): SalesAnalyticsResponse {
  const grouped = new Map<string, FinancialEvent[]>();
  for (const event of events) {
    const key = bucketStart(event.date, group);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }

  const trend: SalesAnalyticsPoint[] = buildBucketKeys(from, to, group).map((period) => {
    const rows = grouped.get(period) ?? [];
    const revenue = sumMoney(rows.map((row) => row.revenue));
    const costComplete = rows.every((row) => row.cogs !== null);
    const cogs = costComplete ? sumMoney(rows.map((row) => row.cogs ?? 0)) : null;
    return {
      period,
      label: bucketLabel(period, group),
      revenue,
      cogs,
      grossProfit: cogs === null ? null : round(revenue - cogs),
      discount: sumMoney(rows.map((row) => row.discount)),
      orders: rows.reduce((sum, row) => sum + row.orderCount, 0),
      returnValue: sumMoney(rows.map((row) => row.returnValue)),
      returns: rows.reduce((sum, row) => sum + row.returnCount, 0),
      exchanges: rows.reduce((sum, row) => sum + row.exchangeCount, 0),
    };
  });

  const revenue = sumMoney(trend.map((row) => row.revenue));
  const cogsComplete = trend.every((row) => row.cogs !== null);
  const cogs = cogsComplete ? sumMoney(trend.map((row) => row.cogs ?? 0)) : null;
  const orders = trend.reduce((sum, row) => sum + row.orders, 0);
  const grossProfit = cogs === null ? null : round(revenue - cogs);
  const reasons = events.flatMap((event) => event.completenessReasons ?? []);
  const costReasons = events
    .filter((event) => event.cogs === null)
    .flatMap((event) => event.completenessReasons ?? ["MISSING_SALE_ITEM_COST" as const]);

  return {
    range: {
      from: businessDateForInstant(from),
      to: businessDateForInstant(to),
      group,
    },
    methodology: {
      revenue:
        "Final billed sale totals plus signed return adjustments (net amount minus refund amount).",
      cogs: "Immutable cost captured on each original sale item.",
      returns: "Returns reverse historical item revenue and cost on their business date.",
      grossProfitReliable: cogsComplete,
      grossProfitNote: cogsComplete
        ? null
        : "Some replacement exchange lines do not have an immutable cost snapshot, so gross profit is unavailable for affected periods.",
    },
    completeness: {
      overall: dataCompleteness(reasons),
      revenue: dataCompleteness(
        reasons.filter((reason) => reason === "LEGACY_RETURN_WITHOUT_ITEMS")
      ),
      cogs: dataCompleteness(costReasons, !cogsComplete),
      grossProfit: dataCompleteness(costReasons, !cogsComplete),
    },
    summary: {
      revenue,
      cogs,
      grossProfit,
      discounts: sumMoney(trend.map((row) => row.discount)),
      orders,
      averageOrderValue: orders > 0 ? round(revenue / orders) : 0,
      returnValue: sumMoney(trend.map((row) => row.returnValue)),
      returns: trend.reduce((sum, row) => sum + row.returns, 0),
      exchanges: trend.reduce((sum, row) => sum + row.exchanges, 0),
    },
    trend,
  };
}
