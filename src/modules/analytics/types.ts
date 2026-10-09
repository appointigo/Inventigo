export type AnalyticsGroup = "day" | "week" | "month" | "year";

import type { DataCompleteness, DataCompletenessReason } from "./completeness";

export type FinancialEvent = {
  date: Date;
  revenue: number;
  cogs: number | null;
  discount: number;
  orderCount: number;
  returnValue: number;
  returnCount: number;
  exchangeCount: number;
  completenessReasons?: DataCompletenessReason[];
};

export type SalesAnalyticsPoint = {
  period: string;
  label: string;
  revenue: number;
  cogs: number | null;
  grossProfit: number | null;
  discount: number;
  orders: number;
  returnValue: number;
  returns: number;
  exchanges: number;
};

export type SalesAnalyticsResponse = {
  scope?: { type: "STORE"; storeId: string; storeName: string };
  range: { from: string; to: string; group: AnalyticsGroup };
  methodology: {
    revenue: string;
    cogs: string;
    returns: string;
    grossProfitReliable: boolean;
    grossProfitNote: string | null;
  };
  completeness: {
    overall: DataCompleteness;
    revenue: DataCompleteness;
    cogs: DataCompleteness;
    grossProfit: DataCompleteness;
  };
  summary: {
    revenue: number;
    cogs: number | null;
    grossProfit: number | null;
    discounts: number;
    orders: number;
    customersServed: number;
    averageOrderValue: number;
    returnValue: number;
    returns: number;
    exchanges: number;
  };
  trend: SalesAnalyticsPoint[];
};

export type ProfitabilityPoint = SalesAnalyticsPoint & {
  operatingExpenses: number;
  netProfit: number | null;
};

export type ProfitabilityResponse = Omit<SalesAnalyticsResponse, "summary" | "trend"> & {
  summary: SalesAnalyticsResponse["summary"] & {
    operatingExpenses: number;
    netProfit: number | null;
    grossMarginPct: number | null;
    netMarginPct: number | null;
    breakEvenRevenue: number | null;
  };
  trend: ProfitabilityPoint[];
};
