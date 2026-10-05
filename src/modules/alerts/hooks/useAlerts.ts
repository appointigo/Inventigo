"use client";

import { useState, useEffect, useCallback } from "react";
import type { AlertConfig, LowStockItem } from "../types";

export function useAlertConfigs() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        setConfigs(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return { configs, loading, refresh: fetchConfigs };
}

export function useLowStockAlerts(storeId?: string) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!storeId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/low-stock?storeId=${encodeURIComponent(storeId)}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { items, loading, refresh: fetchAlerts };
}
