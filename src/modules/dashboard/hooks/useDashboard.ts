"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "../types";

const inFlightDashboardRequests = new Map<string, Promise<DashboardData>>();

function requestDashboard(url: string) {
  const existingRequest = inFlightDashboardRequests.get(url);
  if (existingRequest) return existingRequest;

  const request = fetch(url).then(async (res) => {
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || `Failed to load dashboard (${res.status})`);
    }
    return res.json() as Promise<DashboardData>;
  });

  inFlightDashboardRequests.set(url, request);
  const clearRequest = () => {
    if (inFlightDashboardRequests.get(url) === request) {
      inFlightDashboardRequests.delete(url);
    }
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

export function useDashboard(storeId?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = storeId ? `/api/dashboard?storeId=${encodeURIComponent(storeId)}` : "/api/dashboard";
      setData(await requestDashboard(url));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
