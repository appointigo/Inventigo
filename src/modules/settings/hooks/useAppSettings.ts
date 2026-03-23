"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppSettings, BillingConfig } from "../types";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setSettings(await res.json());
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateBillingConfig = useCallback(
    async (config: Partial<BillingConfig>): Promise<void> => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingConfig: config }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }
      const updated = await res.json();
      setSettings(updated);
    },
    []
  );

  return { settings, loading, refresh: fetchSettings, updateBillingConfig };
}
