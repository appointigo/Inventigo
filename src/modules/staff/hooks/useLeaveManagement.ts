"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaveApplicationInput, LeaveDecisionInput, LeaveListResponse } from "../types";

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json() as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

type LeaveFilters = {
  storeId?: string | null;
  userId?: string | null;
  from?: string;
  to?: string;
  status?: string | null;
};

export function useLeaveManagement(filters: LeaveFilters) {
  const [data, setData] = useState<LeaveListResponse>({ records: [], balances: [] });
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
      const res = await fetch(`/api/leave/list?${params.toString()}`);
      if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to load leave records"));
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.status, filters.storeId, filters.to, filters.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyLeave = useCallback(async (input: LeaveApplicationInput) => {
    const res = await fetch("/api/leave/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to apply leave"));
    await refresh();
    return res.json();
  }, [refresh]);

  const approveLeave = useCallback(async (input: LeaveDecisionInput) => {
    const res = await fetch("/api/leave/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to approve leave"));
    await refresh();
    return res.json();
  }, [refresh]);

  const rejectLeave = useCallback(async (input: LeaveDecisionInput) => {
    const res = await fetch("/api/leave/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to reject leave"));
    await refresh();
    return res.json();
  }, [refresh]);

  const cancelLeave = useCallback(async (input: LeaveDecisionInput) => {
    const res = await fetch("/api/leave/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to cancel leave"));
    await refresh();
    return res.json();
  }, [refresh]);

  return {
    data,
    loading,
    refresh,
    applyLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
  };
}