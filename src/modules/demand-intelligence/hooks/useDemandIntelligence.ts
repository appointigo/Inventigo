"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerVisitInput, DemandAnalyticsResponse } from "../types";

export function useDemandIntelligence(storeId?: string, start?: string, end?: string) {
  return useQuery({
    queryKey: ["demand-intelligence", storeId, start, end],
    enabled: Boolean(storeId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ storeId: storeId! });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const response = await fetch(`/api/demand-intelligence?${params}`, { signal });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to load demand intelligence");
      }
      return (await response.json()) as DemandAnalyticsResponse;
    },
  });
}

export function useCreateCustomerVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerVisitInput) => {
      const response = await fetch("/api/customer-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to save customer visit");
      }
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["demand-intelligence"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] }),
      ]);
    },
  });
}
