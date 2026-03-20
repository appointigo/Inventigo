"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Typography, Card, Spin, App } from "antd";
import CategoryForm from "@/modules/categories/components/CategoryForm";
import { useCategory } from "@/modules/categories/hooks/useCategories";
import type { CategoryFormValues } from "@/modules/categories/types";

export default function EditCategoryPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { category, loading } = useCategory(params.id);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(params.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to update category");
        return;
      }
      message.success("Category updated");
      router.push("/dashboard/categories");
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
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Edit Category
      </Typography.Title>
      <Card>
        <CategoryForm
          initialValues={category}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/categories")}
          loading={saving}
        />
      </Card>
    </div>
  );
}
