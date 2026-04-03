"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Typography, Card, Spin, App } from "antd";
import ProductForm from "@/modules/products/components/ProductForm";
import { useProduct } from "@/modules/products/hooks/useProducts";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useStore } from "@/providers/StoreProvider";
import type { ProductFormValues } from "@/modules/products/types";

export default function EditProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { storeId } = useStore();
  const { product, loading } = useProduct(params.id, storeId ?? undefined);
  const { categories } = useCategories();
  const { brands } = useBrands();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(params.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, storeId: storeId ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to update product");
        return;
      }
      message.success("Product updated");
      router.push("/dashboard/products");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Edit Product
      </Typography.Title>
      <Card>
        <ProductForm
          initialValues={product}
          categories={categories}
          brands={brands}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/products")}
          loading={saving}
        />
      </Card>
    </div>
  );
}
