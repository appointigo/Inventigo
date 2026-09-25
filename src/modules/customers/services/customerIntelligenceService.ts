import "server-only";
import { prisma } from "@/lib/db";
import type { CustomerGroupFilter, CustomerSortField, SortDirection } from "../types";
import {
  DEFAULT_BUSINESS_TIME_ZONE,
  getCustomerDateWindow,
  isInCustomerDateWindow,
  type CustomerDatePreset,
} from "../utils/customerDateWindow";

const DAY_MS = 86_400_000;
const toPaise = (value: { toFixed(digits: number): string } | number | string | null) => {
  const fixed =
    typeof value === "object" && value ? value.toFixed(2) : Number(value ?? 0).toFixed(2);
  const negative = fixed.startsWith("-");
  const [whole, fraction = "00"] = fixed.replace("-", "").split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -result : result;
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

export type CustomerMetricRow = {
  id: string;
  name: string | null;
  mobile: string;
  preferredStoreId: string | null;
  preferredStoreName: string | null;
  totalSpent: number;
  totalOrders: number;
  lastPurchaseAt: string | null;
  groups: Array<
    "Recently Purchased" | "Repeat Customer" | "High Spender" | "Need Attention" | "Never Purchased"
  >;
  activityStatus: "Recently purchased" | "Past customer" | "Never purchased";
};
type Query = {
  storeId?: string | null;
  search?: string;
  group?: CustomerGroupFilter;
  page?: number;
  pageSize?: number;
  sortBy?: CustomerSortField;
  sortDirection?: SortDirection;
  lastPurchaseDays?: CustomerDatePreset;
  minSpend?: number;
  maxSpend?: number;
  minOrders?: number;
  maxOrders?: number;
  now?: Date;
  timeZone?: string;
};

async function buildPopulation(orgId: string, storeId?: string | null, now = new Date()) {
  const customers = await prisma.customer.findMany({
    where: {
      orgId,
      ...(storeId
        ? {
            OR: [
              { preferredStoreId: storeId },
              { sales: { some: { storeId } } },
              { visits: { some: { storeId } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      mobile: true,
      preferredStoreId: true,
      preferredStore: { select: { name: true } },
      sales: {
        where: {
          ...(storeId ? { storeId } : {}),
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
        },
        select: {
          id: true,
          total: true,
          finalPayableAmount: true,
          transactionDate: true,
          returnTransactions: { select: { type: true, netAmount: true, refundAmount: true } },
        },
      },
    },
  });
  const recentCutoff = now.getTime() - 90 * DAY_MS;
  const yearCutoff = now.getTime() - 365 * DAY_MS;
  const computed = customers.map((customer) => {
    const orders = customer.sales
      .map((sale) => {
        const adjustment = sale.returnTransactions.reduce(
          (sum, item) =>
            sum +
            (item.type === "RETURN"
              ? -toPaise(item.refundAmount)
              : toPaise(item.netAmount) - toPaise(item.refundAmount)),
          0
        );
        return {
          date: sale.transactionDate,
          retained: Math.max(0, toPaise(sale.finalPayableAmount ?? sale.total) + adjustment),
        };
      })
      .filter((order) => order.retained > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = orders.at(-1)?.date ?? null;
    const intervals = orders
      .slice(1)
      .map((order, index) =>
        Math.max(1, Math.round((order.date.getTime() - orders[index].date.getTime()) / DAY_MS))
      );
    const expectedDays = intervals.length
      ? Math.min(180, Math.max(45, Math.round(median(intervals) * 1.5)))
      : 180;
    return {
      customer,
      orders,
      last,
      overdue: Boolean(last && now.getTime() - last.getTime() > expectedDays * DAY_MS),
      lifetime: orders.reduce((sum, order) => sum + order.retained, 0),
      trailing: orders
        .filter((order) => order.date.getTime() >= yearCutoff)
        .reduce((sum, order) => sum + order.retained, 0),
    };
  });
  const eligible = computed
    .filter((item) => item.orders.length && item.trailing > 0)
    .sort((a, b) => b.trailing - a.trailing);
  const highCutoff = eligible.length
    ? eligible[Math.max(0, Math.ceil(eligible.length * 0.2) - 1)].trailing
    : Number.POSITIVE_INFINITY;
  return computed.map(
    ({ customer, orders, last, overdue, lifetime, trailing }): CustomerMetricRow => {
      const groups: CustomerMetricRow["groups"] = [];
      if (!orders.length) groups.push("Never Purchased");
      if (last && last.getTime() >= recentCutoff) groups.push("Recently Purchased");
      if (orders.length >= 2) groups.push("Repeat Customer");
      if (trailing > 0 && trailing >= highCutoff) groups.push("High Spender");
      if (orders.length && overdue) groups.push("Need Attention");
      return {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        preferredStoreId: customer.preferredStoreId,
        preferredStoreName: customer.preferredStore?.name ?? null,
        totalSpent: lifetime / 100,
        totalOrders: orders.length,
        lastPurchaseAt: last?.toISOString() ?? null,
        groups,
        activityStatus: !orders.length
          ? "Never purchased"
          : last && last.getTime() >= recentCutoff
            ? "Recently purchased"
            : "Past customer",
      };
    }
  );
}

const groupLabel = {
  recent: "Recently Purchased",
  repeat: "Repeat Customer",
  high_spenders: "High Spender",
  attention: "Need Attention",
  never_purchased: "Never Purchased",
} as const;
export const customerIntelligenceService = {
  async query(orgId: string, query: Query = {}) {
    const now = query.now ?? new Date();
    const population = await buildPopulation(orgId, query.storeId, now);
    const counts = {
      all: population.length,
      recent: population.filter((row) => row.groups.includes("Recently Purchased")).length,
      repeat: population.filter((row) => row.groups.includes("Repeat Customer")).length,
      high_spenders: population.filter((row) => row.groups.includes("High Spender")).length,
      attention: population.filter((row) => row.groups.includes("Need Attention")).length,
      never_purchased: population.filter((row) => row.groups.includes("Never Purchased")).length,
    };
    const text = query.search?.trim().toLocaleLowerCase("en-IN") ?? "";
    const digits = query.search?.replace(/\D/g, "") ?? "";
    const dateWindow = query.lastPurchaseDays
      ? getCustomerDateWindow(
          query.lastPurchaseDays,
          now,
          query.timeZone ?? DEFAULT_BUSINESS_TIME_ZONE
        )
      : null;
    const group = query.group ?? "all";
    const rows = population.filter(
      (row) =>
        (group === "all" || row.groups.includes(groupLabel[group])) &&
        (!text ||
          row.name?.toLocaleLowerCase("en-IN").includes(text) ||
          (digits && row.mobile.includes(digits))) &&
        (!dateWindow || isInCustomerDateWindow(row.lastPurchaseAt, dateWindow)) &&
        (query.minSpend === undefined || row.totalSpent >= query.minSpend) &&
        (query.maxSpend === undefined || row.totalSpent <= query.maxSpend) &&
        (query.minOrders === undefined || row.totalOrders >= query.minOrders) &&
        (query.maxOrders === undefined || row.totalOrders <= query.maxOrders)
    );
    const direction = query.sortDirection === "asc" ? 1 : -1;
    const sortBy = query.sortBy ?? "lastPurchase";
    rows.sort(
      (a, b) =>
        direction *
        (sortBy === "name"
          ? (a.name ?? "").localeCompare(b.name ?? "")
          : sortBy === "spend"
            ? a.totalSpent - b.totalSpent
            : sortBy === "orders"
              ? a.totalOrders - b.totalOrders
              : (a.lastPurchaseAt ? Date.parse(a.lastPurchaseAt) : 0) -
                (b.lastPurchaseAt ? Date.parse(b.lastPurchaseAt) : 0))
    );
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    return {
      generatedAt: new Date().toISOString(),
      scope: query.storeId ? "store" : "organization",
      counts,
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  },
  async insights(orgId: string, storeId?: string | null) {
    const result = await this.query(orgId, { storeId, pageSize: 1 });
    return {
      generatedAt: result.generatedAt,
      scope: result.scope,
      totalCustomers: result.counts.all,
      activeCustomers: result.counts.recent,
      repeatCustomers: result.counts.repeat,
      highValueCustomers: result.counts.high_spenders,
      atRiskCustomers: result.counts.attention,
      neverPurchased: result.counts.never_purchased,
    };
  },
};
