"use client";

import { useState, useEffect, useCallback } from "react";
import type { Brand } from "../types";

export function useBrands(storeId?: string) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
      const res = await fetch(`/api/brands${qs}`);
      if (res.ok) setBrands(await res.json());
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return { brands, loading, refresh: fetchBrands };
}
