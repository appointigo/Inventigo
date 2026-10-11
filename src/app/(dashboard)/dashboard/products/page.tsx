"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Typography, App } from "antd";
import ProductTable from "@/modules/products/components/ProductTable";
import ProductBulkUploadDrawer from "@/modules/products/components/BulkUploadDrawer";
import type { Product } from "@/modules/products/types";
import type { Category } from "@/modules/categories/types";
import {
  mapProductToDuplicateDraft,
  saveDuplicateDraft,
} from "@/modules/products/utils/duplicateProduct";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { useStore } from "@/providers/StoreProvider";

const MobileProductsPage = dynamic(() => import("@/modules/mobile-dashboard/pages/ProductsPage"));

export default function ProductsPage() {
  const { message } = App.useApp();
  const { isMobile, isReady } = useMobileViewport();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { storeId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") ?? "");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(20);
  const [categoryAttributeSchema, setCategoryAttributeSchema] = useState<
    Category["attributeSchema"] | null
  >(null);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);

  const schemaCache = useRef<Map<string, Category["attributeSchema"]>>(new Map());
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestedStoreIdRef = useRef<string | null>(null);

  const categoriesQuery = useCategories();
  const brandsQuery = useBrands();
  const { categories } = categoriesQuery;
  const { brands } = brandsQuery;

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategoryId =
    searchParams.get("categoryId") ?? searchParams.get("category") ?? undefined;
  const currentBrandId = searchParams.get("brandId") ?? searchParams.get("brand") ?? undefined;
  const currentCategory = useMemo(
    () => (currentCategoryId ? categories.find((c) => c.id === currentCategoryId) : undefined),
    [currentCategoryId, categories]
  );
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const currentPageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? searchParams.get("limit") ?? "20"))
  );
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setLocalPage(currentPage);
    setLocalPageSize(currentPageSize);
  }, [currentPage, currentPageSize]);

  const attributeFilters = useMemo(() => {
    const result: Record<string, string | string[]> = {};
    for (const [key, value] of searchParams.entries()) {
      const knownKeys = new Set([
        "search",
        "categoryId",
        "category",
        "brandId",
        "brand",
        "page",
        "pageSize",
        "limit",
        "storeId",
        "isActive",
      ]);
      if (knownKeys.has(key)) continue;
      if (!value || value === "undefined" || value === "null") continue;

      if (result[key]) {
        const existing = result[key];
        result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        result[key] = value;
      }
    }
    return result;
  }, [searchParams]);

  const normalizedQueryString = useMemo(() => {
    const params = new URLSearchParams();
    const sortedKeys = Array.from(new Set(Array.from(searchParams.keys()))).sort();
    sortedKeys.forEach((key) => {
      searchParams.getAll(key).forEach((value) => params.append(key, value));
    });
    return params.toString();
  }, [searchParams]);

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined | null>, clearAttributeFilters = false) => {
      const next = new URLSearchParams(searchParams.toString());
      if (clearAttributeFilters) {
        const knownKeys = new Set([
          "search",
          "categoryId",
          "category",
          "brandId",
          "brand",
          "page",
          "pageSize",
          "limit",
          "storeId",
          "isActive",
        ]);
        for (const key of Array.from(next.keys())) {
          if (!knownKeys.has(key)) {
            next.delete(key);
          }
        }
      }

      Object.entries(patch).forEach(([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          value === "undefined" ||
          value === "null"
        ) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (searchInput.trim() === currentSearch) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const normalizedSearch = searchInput.trim();
      if (normalizedSearch) next.set("search", normalizedSearch);
      else next.delete("search");
      next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [currentSearch, pathname, router, searchInput, searchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleCategoryChange = useCallback(
    (value: string | undefined) => updateQuery({ categoryId: value || undefined, page: "1" }, true),
    [updateQuery]
  );

  const handleBrandChange = useCallback(
    (value: string | undefined) => updateQuery({ brandId: value || undefined, page: "1" }),
    [updateQuery]
  );

  const handleAttributeChange = useCallback(
    (name: string, value: string | string[] | boolean | undefined) => {
      const normalizedValue = Array.isArray(value)
        ? value.length > 0
          ? value.join(",")
          : undefined
        : value === undefined || value === ""
          ? undefined
          : String(value);
      updateQuery({ [name]: normalizedValue || undefined, page: "1" });
    },
    [updateQuery]
  );

  const handleClearAttributeFilters = useCallback(() => {
    updateQuery({ page: "1" }, true);
  }, [updateQuery]);

  const handleClearAllFilters = useCallback(() => {
    setSearchInput("");
    const next = new URLSearchParams();
    const storeValue = searchParams.get("storeId");
    if (storeValue) next.set("storeId", storeValue);
    const pageSize = searchParams.get("pageSize") ?? searchParams.get("limit");
    if (pageSize) next.set("pageSize", pageSize);
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!currentCategoryId) {
      setCategoryAttributeSchema(null);
      return;
    }

    if (schemaCache.current.has(currentCategoryId)) {
      setCategoryAttributeSchema(schemaCache.current.get(currentCategoryId)!);
      return;
    }

    setCategoryAttributeSchema(null);
  }, [currentCategoryId]);

  const fetchProducts = useCallback(async () => {
    if (!isReady || isMobile || !storeId) {
      abortControllerRef.current?.abort();
      requestIdRef.current += 1;
      requestedStoreIdRef.current = null;
      setProducts([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    if (requestedStoreIdRef.current && requestedStoreIdRef.current !== storeId) {
      setProducts([]);
      setTotal(0);
    }
    requestedStoreIdRef.current = storeId;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const params = new URLSearchParams(normalizedQueryString);
    params.set("storeId", storeId);
    const queryString = params.toString();

    setLoading(true);
    try {
      const url = `/api/products${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        if (requestId !== requestIdRef.current) return;
        const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
        message.error(errorBody?.error || "Unable to load products. Please try again.");
        return;
      }

      const json = await res.json();
      if (requestId !== requestIdRef.current) return;
      const items: Product[] = Array.isArray(json.items) ? json.items : [];
      const nextCategoryAttributeSchema = json.categoryAttributeSchema ?? null;

      setProducts(items);
      setTotal(Number(json.total ?? items.length));
      setCategoryAttributeSchema(nextCategoryAttributeSchema);

      if (currentCategoryId && nextCategoryAttributeSchema) {
        schemaCache.current.set(currentCategoryId, nextCategoryAttributeSchema);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (requestId === requestIdRef.current) {
        message.error("Unable to load products. Check your connection and try again.");
      }
      console.warn("[Product list request failed]", error);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [normalizedQueryString, storeId, currentCategoryId, isReady, isMobile, message]);

  useEffect(() => {
    fetchProducts();
    return () => abortControllerRef.current?.abort();
  }, [fetchProducts]);

  const refresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to delete");
        return;
      }
      message.success("Product deleted");
      refresh();
    },
    [message, refresh]
  );

  const handleDuplicate = useCallback(
    async (product: Product) => {
      setDuplicateLoadingId(product.id);
      try {
        // No need to fetch again - product data is already available from the table
        saveDuplicateDraft(mapProductToDuplicateDraft(product));
        router.push("/dashboard/products/new?duplicate=1");
      } catch {
        message.error("Failed to prepare product for duplication");
      } finally {
        setDuplicateLoadingId(null);
      }
    },
    [message, router]
  );

  if (!isReady) {
    return null;
  }

  if (isMobile) {
    return <MobileProductsPage />;
  }

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Products
      </Typography.Title>
      <ProductTable
        products={products}
        categories={categories}
        brands={brands}
        loading={loading}
        total={total}
        page={localPage}
        pageSize={localPageSize}
        onPaginationChange={(nextPage, nextPageSize) => {
          setLocalPage(nextPage);
          setLocalPageSize(nextPageSize);
          updateQuery({ page: String(nextPage), pageSize: String(nextPageSize) });
        }}
        search={searchInput}
        onSearchChange={handleSearchChange}
        categoryFilter={currentCategoryId}
        onCategoryChange={handleCategoryChange}
        brandFilter={currentBrandId}
        onBrandChange={handleBrandChange}
        onAdd={() => router.push("/dashboard/products/new")}
        onView={(p) => router.push(`/dashboard/products/${p.id}`)}
        onEdit={(p) => router.push(`/dashboard/products/${p.id}/edit`)}
        onDuplicate={handleDuplicate}
        duplicateLoadingId={duplicateLoadingId}
        onDelete={handleDelete}
        onBulkUpload={() => setBulkDrawerOpen(true)}
        attributeSchema={categoryAttributeSchema}
        attributeFilters={attributeFilters}
        onAttributeChange={handleAttributeChange}
        onClearAttributeFilters={handleClearAttributeFilters}
        onClearAllFilters={handleClearAllFilters}
        currentCategory={currentCategory}
      />
      <ProductBulkUploadDrawer
        open={bulkDrawerOpen}
        onClose={() => setBulkDrawerOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
