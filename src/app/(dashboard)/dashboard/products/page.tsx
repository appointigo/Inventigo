"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Typography, message } from "antd";
import ProductTable from "@/modules/products/components/ProductTable";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [brandFilter, setBrandFilter] = useState<string | undefined>();

  const { products, loading, refresh } = useProducts({
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
        onDelete={handleDelete}
      />
    </div>
  );
}
