"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerVisitInput,
  CustomerVisitPatchInput,
  CustomerVisitRecord,
  DemandAnalyticsResponse,
} from "../types";

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
      return response.json() as Promise<CustomerVisitRecord>;
    },
    onSuccess: async (visit, input) => {
      queryClient.setQueriesData<CustomerVisitRecord[]>(
        {
          predicate: (query) => {
            const [scope, storeId, start, end] = query.queryKey;
            if (scope !== "customer-visits" || storeId !== input.storeId) return false;
            const visitedAt = Date.parse(visit.visitedAt);
            return (
              (typeof start !== "string" || visitedAt >= Date.parse(start)) &&
              (typeof end !== "string" || visitedAt < Date.parse(end))
            );
          },
        },
        (current) =>
          current
            ? [visit, ...current.filter((existing) => existing.id !== visit.id)]
                .sort((left, right) => Date.parse(right.visitedAt) - Date.parse(left.visitedAt))
                .slice(0, 200)
            : current
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["demand-intelligence"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["customer-visits"], refetchType: "active" }),
        queryClient.invalidateQueries({
          queryKey: ["inventory-intelligence"],
          refetchType: "active",
        }),
        ...(input.customerId
          ? [queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "active" })]
          : []),
      ]);
    },
  });
}

export function useCustomerVisits(storeId?: string, start?: string, end?: string) {
  return useQuery({
    queryKey: ["customer-visits", storeId, start, end],
    enabled: Boolean(storeId),
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ storeId: storeId! });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const response = await fetch(`/api/customer-visits?${params}`, { signal });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to load customer visits");
      }
      return (await response.json()) as CustomerVisitRecord[];
    },
  });
}

export function useUpdateCustomerVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CustomerVisitPatchInput }) => {
      const response = await fetch(`/api/customer-visits/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to update customer visit");
      }
      return response.json() as Promise<CustomerVisitRecord>;
    },
    onSuccess: async (visit) => {
      queryClient.setQueriesData<CustomerVisitRecord[]>(
        { queryKey: ["customer-visits"] },
        (current) =>
          current?.map((existing) => (existing.id === visit.id ? visit : existing)) ?? current
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-visits"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["demand-intelligence"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "active" }),
      ]);
    },
  });
}
