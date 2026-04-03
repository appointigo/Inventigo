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
      if (filters?.storeId) params.set("storeId", filters.storeId);
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.brandId) params.set("brandId", filters.brandId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
      const qs = params.toString();
      const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
      if (res.ok) setProducts(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch products:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [filters?.storeId, filters?.categoryId, filters?.brandId, filters?.search, filters?.isActive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refresh: fetchProducts };
}

export function useProduct(id: string | null, storeId?: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
      const res = await fetch(`/api/products/${encodeURIComponent(id)}${qs}`);
      const data = res.ok ? await res.json() : null;
      setProduct(data);
    } 
    catch (error) {
      console.error("Failed to fetch product:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading };
}
