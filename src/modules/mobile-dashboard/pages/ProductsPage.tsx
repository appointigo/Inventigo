"use client";

import { Empty, Select, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useStore } from "@/providers/StoreProvider";
import { FilterDrawer } from "../components/FilterDrawer";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { PageContainer } from "../components/PageContainer";
import { ProductCard } from "../components/ProductCard";
import { SearchBar } from "../components/SearchBar";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

export default function ProductsPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const { productFilters, setProductFilters, isProductFilterOpen, openProductFilter, closeProductFilter, resetProductFilters } = useMobileWorkspace();
  const { categories } = useCategories(storeId ?? undefined);
  const { brands } = useBrands(storeId ?? undefined);
  const { products, loading } = useProducts({
    storeId: storeId ?? undefined,
    search: productFilters.search || undefined,
    categoryId: productFilters.categoryId,
    brandId: productFilters.brandId,
  });

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
              <ProductCard key={product.id} product={product} />
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
