"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Card, App } from "antd";
import ProductForm from "@/modules/products/components/ProductForm";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useStore } from "@/providers/StoreProvider";
import type { ProductFormValues } from "@/modules/products/types";

export default function NewProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { storeId } = useStore();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, storeId: storeId ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to create product");
        return;
      }
      message.success("Product created");
      router.push("/dashboard/products");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        New Product
      </Typography.Title>
      <Card>
        <ProductForm
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
