"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  InventoryComparisonMode,
  InventoryDrilldownRow,
  InventoryIntelligenceResponse,
  InventoryPeriodPreset,
} from "../types";

export type InventoryIntelligenceFilters = {
  storeId?: string;
  period: InventoryPeriodPreset;
  comparisonMode: InventoryComparisonMode;
  customStart?: string;
  customEnd?: string;
};

export function useInventoryIntelligence(filters: InventoryIntelligenceFilters) {
  return useQuery({
    queryKey: [
      "inventory-intelligence",
      filters.storeId,
      filters.period,
      filters.comparisonMode,
      filters.customStart,
      filters.customEnd,
    ],
    enabled:
      Boolean(filters.storeId) &&
      (filters.period !== "custom" || Boolean(filters.customStart && filters.customEnd)),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        storeId: filters.storeId!,
        period: filters.period,
        compare: filters.comparisonMode,
      });
      if (filters.customStart && filters.customEnd) {
        params.set("start", filters.customStart);
        params.set("end", filters.customEnd);
      }
      const response = await fetch(`/api/dashboard/inventory-intelligence?${params}`, { signal });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to load inventory intelligence");
      }
      return (await response.json()) as InventoryIntelligenceResponse;
    },
  });
}

export function useInventoryDrilldown(filters: InventoryIntelligenceFilters, categoryId?: string) {
  return useQuery({
    queryKey: [
      "inventory-intelligence-drilldown",
      filters.storeId,
      filters.period,
      filters.comparisonMode,
      filters.customStart,
      filters.customEnd,
      categoryId,
    ],
    enabled:
      Boolean(filters.storeId && categoryId) &&
      (filters.period !== "custom" || Boolean(filters.customStart && filters.customEnd)),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        storeId: filters.storeId!,
        categoryId: categoryId!,
        period: filters.period,
        compare: filters.comparisonMode,
      });
      if (filters.customStart && filters.customEnd) {
        params.set("start", filters.customStart);
        params.set("end", filters.customEnd);
      }
      const response = await fetch(`/api/dashboard/inventory-intelligence/drilldown?${params}`, {
        signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to load category detail");
      }
      return (await response.json()) as InventoryDrilldownRow[];
    },
  });
}
