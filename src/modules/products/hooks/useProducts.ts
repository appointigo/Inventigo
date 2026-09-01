"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Product, ProductListFilters, PaginatedProductsResponse } from "../types";

type UseProductsOptions = {
  enabled?: boolean;
};

export function useProducts(filters?: ProductListFilters, options?: UseProductsOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(filters?.page ?? 1);
  const [pageSize, setPageSize] = useState(filters?.pageSize ?? 10);
  const [resolvedSearch, setResolvedSearch] = useState("");
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const enabled = options?.enabled ?? true;

  const fetchProducts = useCallback(async () => {
    if (!enabled) {
      abortControllerRef.current?.abort();
      requestIdRef.current += 1;
      setProducts([]);
      setTotal(0);
      setResolvedSearch("");
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.storeId) params.set("storeId", filters.storeId);
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.brandId) params.set("brandId", filters.brandId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
      if (filters?.page !== undefined) params.set("page", String(filters.page));
      if (filters?.pageSize !== undefined) params.set("pageSize", String(filters.pageSize));
      const qs = params.toString();
      const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as Product[] | PaginatedProductsResponse;
        if (requestId !== requestIdRef.current) return;
        if (Array.isArray(data)) {
          setProducts(data);
          setTotal(data.length);
          setPage(filters?.page ?? 1);
          setPageSize(filters?.pageSize ?? Math.max(data.length, 1));
        } else {
          setProducts(data.items);
          setTotal(data.total);
          setPage(data.page);
          setPageSize(data.pageSize);
        }
        setResolvedSearch(filters?.search ?? "");
      } else if (requestId === requestIdRef.current) {
        setProducts([]);
        setTotal(0);
        setResolvedSearch(filters?.search ?? "");
      }
    } 
    catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to fetch products:", error);
    } 
    finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, filters?.storeId, filters?.categoryId, filters?.brandId, filters?.search, filters?.isActive, filters?.page, filters?.pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return { products, loading, total, page, pageSize, resolvedSearch, refresh: fetchProducts };
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
