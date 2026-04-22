"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Typography, App } from "antd";
import ProductTable from "@/modules/products/components/ProductTable";
import ProductBulkUploadDrawer from "@/modules/products/components/BulkUploadDrawer";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { Product } from "@/modules/products/types";
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
  const { storeId } = useStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [brandFilter, setBrandFilter] = useState<string | undefined>();
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);

  const { products, loading, refresh } = useProducts({
    storeId: storeId ?? undefined,
    search: search || undefined,
    categoryId: categoryFilter,
    brandId: brandFilter,
  });
  const { categories } = useCategories();
  const { brands } = useBrands();

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
    [refresh]
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
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        brandFilter={brandFilter}
        onBrandChange={setBrandFilter}
        onAdd={() => router.push("/dashboard/products/new")}
        onView={(p) => router.push(`/dashboard/products/${p.id}`)}
        onEdit={(p) => router.push(`/dashboard/products/${p.id}/edit`)}
        onDuplicate={handleDuplicate}
        duplicateLoadingId={duplicateLoadingId}
        onDelete={handleDelete}
        onBulkUpload={() => setBulkDrawerOpen(true)}
      />
      <ProductBulkUploadDrawer
        open={bulkDrawerOpen}
        onClose={() => setBulkDrawerOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
