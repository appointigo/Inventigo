"use client";

import { useState, useEffect, useCallback } from "react";
import type { StockLevelRow, StockMovementRow } from "../types";

export type StockListFilters = {
  storeId?: string;
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  page?: number;
  pageSize?: number;
};

type PaginatedStockResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const useStockLevels = (filters?: StockListFilters) => {
  const [stockLevels, setStockLevels] = useState<StockLevelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    if (!filters?.storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("storeId", filters.storeId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.lowStockOnly) params.set("lowStockOnly", "true");
      if (filters?.outOfStockOnly) params.set("outOfStockOnly", "true");
      const paginated = filters?.page !== undefined || filters?.pageSize !== undefined;
      if (paginated) {
        params.set("paginated", "true");
        params.set("page", String(filters?.page ?? 1));
        params.set("pageSize", String(filters?.pageSize ?? 20));
      }
      const qs = params.toString();
      const res = await fetch(`/api/stock${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = (await res.json()) as StockLevelRow[] | PaginatedStockResponse<StockLevelRow>;
        if (Array.isArray(data)) {
          setStockLevels(data);
          setTotal(data.length);
        } else {
          setStockLevels(data.items);
          setTotal(data.total);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [
    filters?.storeId,
    filters?.search,
    filters?.lowStockOnly,
    filters?.outOfStockOnly,
    filters?.page,
    filters?.pageSize,
  ]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  return { stockLevels, total, loading, refresh: fetchLevels };
};

export const useStockMovements = (
  storeId?: string,
  pagination?: { page: number; pageSize: number }
) => {
  const page = pagination?.page;
  const pageSize = pagination?.pageSize;
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId });
      if (page !== undefined && pageSize !== undefined) {
        params.set("paginated", "true");
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
      }
      const res = await fetch(`/api/stock/movements?${params}`);
      if (res.ok) {
        const data = (await res.json()) as
          | StockMovementRow[]
          | PaginatedStockResponse<StockMovementRow>;
        if (Array.isArray(data)) {
          setMovements(data);
          setTotal(data.length);
        } else {
          setMovements(data.items);
          setTotal(data.total);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, page, pageSize]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return { movements, total, loading, refresh: fetchMovements };
};
