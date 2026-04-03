"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Typography, App } from "antd";
import CategoryTable from "@/modules/categories/components/CategoryTable";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useStore } from "@/providers/StoreProvider";

export default function CategoriesPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { storeId } = useStore();
  const { categories, loading, refresh } = useCategories(storeId ?? undefined);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to delete");
        return;
      }
      message.success("Category deleted");
      refresh();
    },
    [refresh]
  );

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Categories
      </Typography.Title>
      <CategoryTable
        categories={categories}
        loading={loading}
        onAdd={() => router.push("/dashboard/categories/new")}
        onEdit={(cat) => router.push(`/dashboard/categories/${cat.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
