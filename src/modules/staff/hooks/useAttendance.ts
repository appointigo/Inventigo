"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceHistoryResponse, AttendanceOverrideInput, WeeklyOffConfig, WeeklyOffDayConfig } from "../types";

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json() as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

type AttendanceFilters = {
  storeId?: string | null;
  userId?: string | null;
  from?: string;
  to?: string;
  status?: string | null;
};

export function useAttendance(filters: AttendanceFilters) {
  const [data, setData] = useState<AttendanceHistoryResponse>({ today: null, records: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.storeId) params.set("storeId", filters.storeId);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load attendance"));
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.status, filters.storeId, filters.to, filters.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkIn = useCallback(async (storeId?: string | null) => {
    const res = await fetch("/api/attendance/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Clock in failed"));
    await refresh();
    return res.json();
  }, [refresh]);

  const checkOut = useCallback(async (storeId?: string | null) => {
    const res = await fetch("/api/attendance/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Clock out failed"));
    await refresh();
    return res.json();
  }, [refresh]);

  const overrideAttendance = useCallback(async (input: AttendanceOverrideInput) => {
    const res = await fetch("/api/attendance/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Override failed"));
    await refresh();
    return res.json();
  }, [refresh]);

  return {
    data,
    loading,
    refresh,
    checkIn,
    checkOut,
    overrideAttendance,
  };
}

export function useWeeklyOffConfig(storeId?: string | null) {
  const [config, setConfig] = useState<WeeklyOffConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setConfig(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-off/set?storeId=${encodeURIComponent(storeId)}`);
      if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to load weekly off"));
      const rows = await res.json() as WeeklyOffConfig[];
      setConfig(rows[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (days: WeeklyOffDayConfig[]) => {
    if (!storeId) throw new Error("Select a store first");
    const res = await fetch("/api/weekly-off/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, days }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to save weekly off"));
    const updated = await res.json();
    setConfig(updated);
    return updated;
  }, [storeId]);

  return { config, loading, refresh, save };
}