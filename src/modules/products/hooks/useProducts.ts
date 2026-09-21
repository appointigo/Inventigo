"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Product, ProductListFilters, PaginatedProductsResponse } from "../types";

type UseProductsOptions = {
  enabled?: boolean;
};

const setOptionalParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) => {
  if (value === undefined || value === "") return;
  const normalized = String(value);
  if (normalized === "undefined" || normalized === "null") return;
  params.set(key, normalized);
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
  const [debouncedSearch, setDebouncedSearch] = useState(filters?.search ?? "");

  useEffect(() => {
    const nextSearch = filters?.search?.trim() ?? "";
    const timer = window.setTimeout(() => setDebouncedSearch(nextSearch), 300);
    return () => window.clearTimeout(timer);
  }, [filters?.search]);

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
      setOptionalParam(params, "storeId", filters?.storeId);
      setOptionalParam(params, "categoryId", filters?.categoryId);
      setOptionalParam(params, "brandId", filters?.brandId);
      setOptionalParam(params, "sizeId", filters?.sizeId);
      setOptionalParam(params, "search", debouncedSearch);
      setOptionalParam(params, "isActive", filters?.isActive);
      setOptionalParam(params, "page", filters?.page);
      setOptionalParam(params, "pageSize", filters?.pageSize);
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
        setResolvedSearch(debouncedSearch);
      } else if (requestId === requestIdRef.current) {
        setProducts([]);
        setTotal(0);
        setResolvedSearch(debouncedSearch);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to fetch products:", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    enabled,
    filters?.storeId,
    filters?.categoryId,
    filters?.brandId,
    filters?.sizeId,
    debouncedSearch,
    filters?.isActive,
    filters?.page,
    filters?.pageSize,
  ]);

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
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading };
}
