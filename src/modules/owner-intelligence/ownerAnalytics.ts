export const OWNER_ANALYTICS_POLICY = {
  minimumPairTransactions: 2,
  maximumProductsPerBasket: 50,
  meaningfulRevenueSharePercent: 1,
} as const;

export type OwnerLineEvent = {
  date: Date;
  orderId: string;
  productId: string;
  product: string;
  category: string;
  brand: string;
  customerId: string | null;
  customer: string;
  revenue: number;
  cogs: number | null;
  units: number;
  discount: number;
  returnValue: number;
  returnUnits: number;
  returnCount: number;
  exchangeCount: number;
};

export type ContributionDimension = "product" | "category" | "brand" | "customer";

const round = (value: number) => Number(value.toFixed(2));
const percent = (part: number, whole: number) => whole === 0 ? 0 : round((part / whole) * 100);

export function aggregateContribution(events: OwnerLineEvent[], dimension: ContributionDimension) {
  const groups = new Map<string, OwnerLineEvent[]>();
  for (const event of events) {
    const key = dimension === "product" ? event.productId : dimension === "customer"
      ? event.customerId ?? "walk-in" : event[dimension];
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const totalRevenue = events.reduce((sum, event) => sum + event.revenue, 0);
  const allCostsComplete = events.every((event) => event.cogs !== null);
  const totalProfit = allCostsComplete
    ? totalRevenue - events.reduce((sum, event) => sum + (event.cogs ?? 0), 0) : null;
  const rows = [...groups.entries()].map(([id, values]) => {
    const revenue = round(values.reduce((sum, event) => sum + event.revenue, 0));
    const costComplete = values.every((event) => event.cogs !== null);
    const cogs = costComplete ? round(values.reduce((sum, event) => sum + (event.cogs ?? 0), 0)) : null;
    const grossProfit = cogs === null ? null : round(revenue - cogs);
    const first = values[0];
    return {
      id,
      name: dimension === "product" ? first.product : dimension === "customer" ? first.customer : first[dimension],
      revenue,
      revenueShare: percent(revenue, totalRevenue),
      units: values.reduce((sum, event) => sum + event.units, 0),
      orders: new Set(values.filter((event) => event.revenue > 0).map((event) => event.orderId)).size,
      cogs,
      grossProfit,
      grossMargin: grossProfit === null ? null : percent(grossProfit, revenue),
      profitShare: grossProfit === null || totalProfit === null ? null : percent(grossProfit, totalProfit),
      discounts: round(values.reduce((sum, event) => sum + event.discount, 0)),
      returnValue: round(values.reduce((sum, event) => sum + event.returnValue, 0)),
      returnUnits: values.reduce((sum, event) => sum + event.returnUnits, 0),
      costComplete,
    };
  }).sort((a, b) => b.revenue - a.revenue);
  const topCount = Math.max(1, Math.ceil(rows.length * 0.2));
  return {
    rows,
    pareto: {
      top10RevenueShare: percent(rows.slice(0, 10).reduce((sum, row) => sum + row.revenue, 0), totalRevenue),
      top20PercentRevenueShare: percent(rows.slice(0, topCount).reduce((sum, row) => sum + row.revenue, 0), totalRevenue),
    },
    totals: { revenue: round(totalRevenue), grossProfit: totalProfit === null ? null : round(totalProfit), costComplete: allCostsComplete },
  };
}

export type BasketInput = { orderId: string; products: Array<{ id: string; name: string }> };

export function analyzeBaskets(baskets: BasketInput[]) {
  const productCounts = new Map<string, number>();
  const productNames = new Map<string, string>();
  const pairCounts = new Map<string, number>();
  let skippedLargeBaskets = 0;
  for (const basket of baskets) {
    const unique = [...new Map(basket.products.map((product) => [product.id, product])).values()]
      .sort((a, b) => a.id.localeCompare(b.id));
    if (unique.length > OWNER_ANALYTICS_POLICY.maximumProductsPerBasket) {
      skippedLargeBaskets += 1;
      continue;
    }
    for (const product of unique) {
      productNames.set(product.id, product.name);
      productCounts.set(product.id, (productCounts.get(product.id) ?? 0) + 1);
    }
    for (let left = 0; left < unique.length; left += 1) {
      for (let right = left + 1; right < unique.length; right += 1) {
        const key = `${unique[left].id}\u0000${unique[right].id}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const eligibleBaskets = baskets.length - skippedLargeBaskets;
  const pairs = [...pairCounts.entries()].filter(([, count]) => count >= OWNER_ANALYTICS_POLICY.minimumPairTransactions)
    .map(([key, transactions]) => {
      const [leftId, rightId] = key.split("\u0000");
      const leftCount = productCounts.get(leftId) ?? 0;
      const rightCount = productCounts.get(rightId) ?? 0;
      const supportRatio = eligibleBaskets ? transactions / eligibleBaskets : 0;
      const liftDenominator = eligibleBaskets ? (leftCount / eligibleBaskets) * (rightCount / eligibleBaskets) : 0;
      return {
        id: key,
        left: productNames.get(leftId) ?? leftId,
        right: productNames.get(rightId) ?? rightId,
        transactions,
        support: round(supportRatio * 100),
        confidenceLeftToRight: percent(transactions, leftCount),
        confidenceRightToLeft: percent(transactions, rightCount),
        lift: liftDenominator ? round(supportRatio / liftDenominator) : 0,
      };
    }).sort((a, b) => b.lift - a.lift || b.transactions - a.transactions);
  return { totalBaskets: eligibleBaskets, skippedLargeBaskets, pairs };
}

export function tradingTime(sales: Array<{ date: Date; orderId: string; revenue: number; units: number; cogs: number | null }>, offsetMinutes = 330) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, orders: new Set<string>(), units: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, day) => ({ day, revenue: 0, orders: new Set<string>(), units: 0, cogs: 0, costComplete: true }));
  const heatmap = Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, hour) => ({ day, hour, revenue: 0, orders: new Set<string>() })));
  for (const sale of sales) {
    const local = new Date(sale.date.getTime() + offsetMinutes * 60_000);
    const hour = local.getUTCHours();
    const day = (local.getUTCDay() + 6) % 7;
    hours[hour].revenue += sale.revenue; hours[hour].orders.add(sale.orderId); hours[hour].units += sale.units;
    weekdays[day].revenue += sale.revenue; weekdays[day].orders.add(sale.orderId); weekdays[day].units += sale.units;
    if (sale.cogs === null) weekdays[day].costComplete = false; else weekdays[day].cogs += sale.cogs;
    heatmap[day][hour].revenue += sale.revenue; heatmap[day][hour].orders.add(sale.orderId);
  }
  const hourRows = hours.map((row) => ({ hour: row.hour, revenue: round(row.revenue), orders: row.orders.size, units: row.units, averageOrderValue: row.orders.size ? round(row.revenue / row.orders.size) : 0 }));
  const weekdayRows = weekdays.map((row) => ({ day: row.day, revenue: round(row.revenue), orders: row.orders.size, units: row.units, grossProfit: row.costComplete ? round(row.revenue - row.cogs) : null }));
  const activeHours = hourRows.filter((row) => row.orders > 0);
  return {
    hours: hourRows,
    weekdays: weekdayRows,
    heatmap: heatmap.flat().map((row) => ({ day: row.day, hour: row.hour, revenue: round(row.revenue), orders: row.orders.size })),
    insights: {
      busiestHour: activeHours.toSorted((a, b) => b.revenue - a.revenue)[0]?.hour ?? null,
      weakestActiveHour: activeHours.toSorted((a, b) => a.revenue - b.revenue)[0]?.hour ?? null,
      strongestWeekday: weekdayRows.toSorted((a, b) => b.revenue - a.revenue)[0]?.day ?? null,
    },
  };
}

export function detectLowMarginRows(rows: Array<{ id: string; name: string; category: string; revenue: number; grossMargin: number | null }>, totalRevenue: number) {
  const categories = new Map<string, number[]>();
  const meaningful = rows.filter((row) => row.grossMargin !== null && percent(row.revenue, totalRevenue) >= OWNER_ANALYTICS_POLICY.meaningfulRevenueSharePercent);
  for (const row of meaningful) categories.set(row.category, [...(categories.get(row.category) ?? []), row.grossMargin!]);
  const median = (values: number[]) => {
    const sorted = values.toSorted((a, b) => a - b); const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return meaningful
    .map((row) => ({ ...row, categoryMedianMargin: round(median(categories.get(row.category) ?? [row.grossMargin!])), marginGap: 0 }))
    .map((row) => ({ ...row, marginGap: round(row.grossMargin! - row.categoryMedianMargin) }))
    .filter((row) => row.marginGap < 0).sort((a, b) => a.marginGap - b.marginGap);
}
