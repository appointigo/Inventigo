"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoreLeavePolicyRecord, UpdateStoreLeavePolicyInput } from "@/modules/staff/types";

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json() as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function useStoreLeavePolicy(storeId?: string | null) {
  const [policies, setPolicies] = useState<StoreLeavePolicyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setPolicies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leave/policy?storeId=${encodeURIComponent(storeId)}`);
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load leave policy"));
      }
      setPolicies(await res.json());
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (nextPolicies: UpdateStoreLeavePolicyInput[]) => {
    if (!storeId) {
      throw new Error("Select a store first");
    }

    const res = await fetch("/api/leave/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, policies: nextPolicies }),
    });

    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Failed to save leave policy"));
    }

    const updated = await res.json() as StoreLeavePolicyRecord[];
    setPolicies(updated);
    return updated;
  }, [storeId]);

  return { policies, loading, refresh, save };
}