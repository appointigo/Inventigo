"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Typography, App } from "antd";
import ProductTable from "@/modules/products/components/ProductTable";
import ProductBulkUploadDrawer from "@/modules/products/components/BulkUploadDrawer";
import type { Product } from "@/modules/products/types";
import type { Category } from "@/modules/categories/types";
import { mapProductToDuplicateDraft, saveDuplicateDraft } from "@/modules/products/utils/duplicateProduct";
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
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(20);
  const [categoryAttributeSchema, setCategoryAttributeSchema] = useState<Category["attributeSchema"] | null>(null);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);

  const schemaCache = useRef<Map<string, Category["attributeSchema"]>>(new Map());
  const responseCache = useRef<
    Map<
      string,
      {
        data: {
          items: Product[];
          total: number;
          page: number;
          pageSize: number;
          categoryAttributeSchema: Category["attributeSchema"] | null;
        };
        timestamp: number;
      }
    >
  >(new Map());

  const categoriesQuery = useCategories();
  const brandsQuery = useBrands();
  const { categories } = categoriesQuery;
  const { brands } = brandsQuery;

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? searchParams.get("category") ?? undefined;
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
  const hasSearchFilters = Boolean(currentSearch || currentCategoryId || currentBrandId);

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
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => updateQuery({ search: value || undefined, page: "1" }),
    [updateQuery]
  );

  const handleCategoryChange = useCallback(
    (value: string | undefined) => updateQuery({ categoryId: value || undefined, page: "1" }, true),
    [updateQuery]
  );

  const handleBrandChange = useCallback(
    (value: string | undefined) => updateQuery({ brandId: value || undefined, page: "1" }),
    [updateQuery]
  );

  const handleAttributeChange = useCallback(
    (name: string, value: string | string[] | undefined) => {
      const normalizedValue = Array.isArray(value) ? value.join(",") : value;
      updateQuery({ [name]: normalizedValue || undefined, page: "1" });
    },
    [updateQuery]
  );

  const handleClearAttributeFilters = useCallback(() => {
    updateQuery({ page: "1" }, true);
  }, [updateQuery]);

  const handleClearAllFilters = useCallback(() => {
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
    const cacheKey = normalizedQueryString;
    const cached = responseCache.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60_000) {
      setProducts(cached.data.items);
      setTotal(cached.data.total);
      setCategoryAttributeSchema(cached.data.categoryAttributeSchema);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = `/api/products${cacheKey ? `?${cacheKey}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load products");
      }

      const json = await res.json();
      const items: Product[] = Array.isArray(json.items) ? json.items : [];
      const nextPage = Number(json.page ?? currentPage) || 1;
      const nextPageSize = Number(json.pageSize ?? currentPageSize) || 10;
      const nextCategoryAttributeSchema = json.categoryAttributeSchema ?? null;

      setProducts(items);
      setTotal(Number(json.total ?? items.length));
      setCategoryAttributeSchema(nextCategoryAttributeSchema);

      if (currentCategoryId && nextCategoryAttributeSchema) {
        schemaCache.current.set(currentCategoryId, nextCategoryAttributeSchema);
      }

      responseCache.current.set(cacheKey, {
        data: {
          items,
          total: Number(json.total ?? items.length),
          page: nextPage,
          pageSize: nextPageSize,
          categoryAttributeSchema: nextCategoryAttributeSchema,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [normalizedQueryString, currentCategoryId, currentPage, currentPageSize]);

  useEffect(() => {
    const timer = window.setTimeout(fetchProducts, 300);
    return () => window.clearTimeout(timer);
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
    [fetchProducts, message, refresh]
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
        search={currentSearch}
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
