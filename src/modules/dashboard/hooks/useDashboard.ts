"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "../types";

export function useDashboard(storeId?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = storeId ? `/api/dashboard?storeId=${encodeURIComponent(storeId)}` : "/api/dashboard";
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
}
