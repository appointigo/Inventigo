"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Card, App } from "antd";
import CategoryForm from "@/modules/categories/components/CategoryForm";
import { useStore } from "@/providers/StoreProvider";
import type { CategoryFormValues } from "@/modules/categories/types";

export default function NewCategoryPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { storeId } = useStore();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, storeId: storeId ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to create category");
        return;
      }
      message.success("Category created");
      router.push("/dashboard/categories");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "8px 24px", maxWidth: 1100 }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        New Category
      </Typography.Title>
      <Card>
        <CategoryForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/categories")}
          loading={saving}
        />
      </Card>
    </div>
  );
}
