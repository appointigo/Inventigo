"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product, ProductListFilters } from "../types";

export function useProducts(filters?: ProductListFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.brandId) params.set("brandId", filters.brandId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
      const qs = params.toString();
      const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filters?.categoryId, filters?.brandId, filters?.search, filters?.isActive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refresh: fetchProducts };
}

export function useProduct(id: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProduct(data))
      .finally(() => setLoading(false));
  }, [id]);

  return { product, loading };
}
