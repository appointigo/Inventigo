"use client";

import { useState, useEffect, useCallback } from "react";
import type { StockLevelRow, StockMovementRow } from "../types";

export type StockListFilters = {
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
};

export const useStockLevels = (filters?: StockListFilters) => {
  const [stockLevels, setStockLevels] = useState<StockLevelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.lowStockOnly) params.set("lowStockOnly", "true");
      if (filters?.outOfStockOnly) params.set("outOfStockOnly", "true");
      const qs = params.toString();
      const res = await fetch(`/api/stock${qs ? `?${qs}` : ""}`);
      if (res.ok) setStockLevels(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.lowStockOnly, filters?.outOfStockOnly]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  return { stockLevels, loading, refresh: fetchLevels };
}

export const useStockMovements = () => {
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stock/movements");
      if (res.ok) setMovements(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return { movements, loading, refresh: fetchMovements };
}
