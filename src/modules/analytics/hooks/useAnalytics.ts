"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaymentMethodDistributionResponse } from "@/modules/dashboard/services/paymentMethodService";
import type { AnalyticsGroup, ProfitabilityResponse, SalesAnalyticsResponse } from "../types";
import { buildAnalyticsSearchParams } from "../utils/dateRange";

export type AnalyticsFilters = {
  storeId?: string;
  from: string;
  to: string;
  group: AnalyticsGroup;
};

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body = (await response.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!response.ok) throw new Error(body?.error ?? "Analytics could not be loaded");
  return body as T;
}

const queryString = (filters: AnalyticsFilters) => buildAnalyticsSearchParams({
  storeId: filters.storeId!,
  from: filters.from,
  to: filters.to,
  group: filters.group,
});

export function useSalesAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["sales-analytics", filters],
    enabled: Boolean(filters.storeId && filters.from && filters.to),
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      fetchJson<SalesAnalyticsResponse>(`/api/analytics/sales?${queryString(filters)}`, signal),
  });
}

export function usePaymentDistribution(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["payment-distribution", filters.storeId, filters.from, filters.to],
    enabled: Boolean(filters.storeId && filters.from && filters.to),
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      const params = buildAnalyticsSearchParams({
        storeId: filters.storeId!,
        from: filters.from,
        to: filters.to,
      });
      return fetchJson<PaymentMethodDistributionResponse>(
        `/api/reports/payment-method-distribution?${params}`,
        signal,
      );
    },
  });
}

export function useProfitabilityAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["profitability-analytics", filters],
    enabled: Boolean(filters.storeId && filters.from && filters.to),
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      fetchJson<ProfitabilityResponse>(
        `/api/analytics/profitability?${queryString(filters)}`,
        signal,
      ),
  });
}

export type DataIntegrityResponse = {
  status: "HEALTHY" | "REVIEW" | "ACTION_REQUIRED";
  completenessPercentage: number;
  issues: Array<{ code: string; severity: "warning" | "error"; count: number; description: string }>;
};

export function useDataIntegrity(storeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics-data-integrity", storeId],
    enabled: Boolean(storeId && enabled),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      fetchJson<DataIntegrityResponse>(
        `/api/analytics/integrity?storeId=${encodeURIComponent(storeId!)}`,
        signal,
      ),
  });
}
