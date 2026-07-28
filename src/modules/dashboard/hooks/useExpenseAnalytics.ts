"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExpenseAnalyticsResponse } from "../types";

export function useExpenseAnalytics(
  storeId: string | null,
  period: "daily" | "weekly" | "monthly" | "yearly",
  startDate?: string,
  endDate?: string,
) {
  const [data, setData] = useState<ExpenseAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!storeId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        storeId,
        period,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      const res = await fetch(`/api/dashboard/expense-analytics?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [endDate, period, startDate, storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
}
