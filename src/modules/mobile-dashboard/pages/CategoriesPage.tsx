"use client";

import { App, Empty, Popconfirm, Skeleton, Typography } from "antd";
import { DeleteOutlined, EditOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useStore } from "@/providers/StoreProvider";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { ListItem } from "../components/ListItem";
import { PageContainer } from "../components/PageContainer";
import { SearchBar } from "../components/SearchBar";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

export default function CategoriesPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { categories, loading, refresh } = useCategories(storeId ?? undefined);
  const { moduleSearch, setModuleSearch } = useMobileWorkspace();

  const rows = categories.filter((category) => category.name.toLowerCase().includes(moduleSearch.categories.toLowerCase()));

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(payload.error || "Failed to delete category");
      return;
    }
    message.success("Category deleted");
    refresh();
  };

  return (
    <>
      <PageContainer
        title="Categories"
        subtitle="Fast category management for small screens"
        stickySlot={<SearchBar value={moduleSearch.categories} placeholder="Search categories" onChange={(value) => setModuleSearch("categories", value)} />}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No categories found" />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((category) => (
              <ListItem
                key={category.id}
                leading={<div style={{ width: 44, height: 44, borderRadius: 14, background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center", fontSize: 18 }}><UnorderedListOutlined /></div>}
                title={category.name}
                subtitle={`${category.productCount} products`}
                meta={<Typography.Text type="secondary">{category.sizes.length} sizes</Typography.Text>}
                action={(
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => router.push(`/dashboard/categories/${category.id}`)} style={{ minHeight: 40, borderRadius: 12, border: "1px solid #dbe4f0", background: "#fff", padding: "0 14px" }}>
                      <EditOutlined /> Edit
                    </button>
                    <Popconfirm title="Delete category?" onConfirm={() => void handleDelete(category.id)}>
                      <button type="button" style={{ minHeight: 40, borderRadius: 12, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", padding: "0 14px" }}>
                        <DeleteOutlined /> Delete
                      </button>
                    </Popconfirm>
                  </div>
                )}
              />
            ))}
          </div>
        )}
      </PageContainer>
      <FloatingActionButton label="Add Category" onClick={() => router.push("/dashboard/categories/new")} />
    </>
  );
}
