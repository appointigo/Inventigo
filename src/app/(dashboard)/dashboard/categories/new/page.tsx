"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Card, message } from "antd";
import CategoryForm from "@/modules/categories/components/CategoryForm";
import type { CategoryFormValues } from "@/modules/categories/types";

export default function NewCategoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
    <div style={{ padding: 24, maxWidth: 800 }}>
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
