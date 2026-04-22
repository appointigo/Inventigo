"use client";

import { useState } from "react";
import { App, Empty, Select, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { Product } from "@/modules/products/types";
import { mapProductToDuplicateDraft, saveDuplicateDraft } from "@/modules/products/utils/duplicateProduct";
import { useStore } from "@/providers/StoreProvider";
import { FilterDrawer } from "../components/FilterDrawer";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { PageContainer } from "../components/PageContainer";
import { ProductCard } from "../components/ProductCard";
import { SearchBar } from "../components/SearchBar";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

export default function ProductsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { storeId } = useStore();
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);
  const { productFilters, setProductFilters, isProductFilterOpen, openProductFilter, closeProductFilter, resetProductFilters } = useMobileWorkspace();
  const { categories } = useCategories(storeId ?? undefined);
  const { brands } = useBrands(storeId ?? undefined);
  const { products, loading } = useProducts({
    storeId: storeId ?? undefined,
    search: productFilters.search || undefined,
    categoryId: productFilters.categoryId,
    brandId: productFilters.brandId,
  });

  const handleDuplicate = async (product: Product) => {
    setDuplicateLoadingId(product.id);
    try {
      // No need to fetch again - product data is already available from the list
      saveDuplicateDraft(mapProductToDuplicateDraft(product));
      router.push("/dashboard/products/new?duplicate=1");
    } catch {
      message.error("Failed to prepare product for duplication");
    } finally {
      setDuplicateLoadingId(null);
    }
  };

  return (
    <>
      <PageContainer
        title="Products"
        subtitle="Search, filter, and review stock status quickly"
        stickySlot={<SearchBar value={productFilters.search} placeholder="Search by name, SKU, or barcode" onChange={(value) => setProductFilters({ search: value })} onFilterClick={openProductFilter} />}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products found" />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDuplicate={handleDuplicate}
                duplicateLoading={duplicateLoadingId === product.id}
              />
            ))}
          </div>
        )}
      </PageContainer>
      <FloatingActionButton label="Add Product" onClick={() => router.push("/dashboard/products/new")} />
      <FilterDrawer title="Product Filters" open={isProductFilterOpen} onClose={closeProductFilter} onReset={resetProductFilters}>
        <Select
          allowClear
          size="large"
          placeholder="Filter by category"
          value={productFilters.categoryId}
          onChange={(value) => setProductFilters({ categoryId: value })}
          options={categories.map((category) => ({ label: category.name, value: category.id }))}
        />
        <Select
          allowClear
          size="large"
          placeholder="Filter by brand"
          value={productFilters.brandId}
          onChange={(value) => setProductFilters({ brandId: value })}
          options={brands.map((brand) => ({ label: brand.name, value: brand.id }))}
        />
      </FilterDrawer>
    </>
  );
}
