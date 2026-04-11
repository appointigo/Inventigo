"use client";

import { App, Empty, Modal, Skeleton } from "antd";
import { DeleteOutlined, EditOutlined, TrademarkOutlined } from "@ant-design/icons";
import { useState } from "react";
import BrandForm from "@/modules/brands/components/BrandForm";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import type { Brand, BrandFormValues } from "@/modules/brands/types";
import { useStore } from "@/providers/StoreProvider";
import { Card } from "../components/Card";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { PageContainer } from "../components/PageContainer";
import { SearchBar } from "../components/SearchBar";
import { useMobileWorkspace } from "../context/MobileWorkspaceContext";

export default function BrandsPage() {
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { brands, loading, refresh } = useBrands(storeId ?? undefined);
  const { moduleSearch, setModuleSearch } = useMobileWorkspace();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows = brands.filter((brand) => brand.name.toLowerCase().includes(moduleSearch.brands.toLowerCase()));

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setOpen(true);
  };

  const handleSubmit = async (values: BrandFormValues) => {
    setSaving(true);
    try {
      const url = editing ? `/api/brands/${encodeURIComponent(editing.id)}` : "/api/brands";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? values : { ...values, storeId: storeId ?? undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(payload.error || "Failed to save brand");
        return;
      }
      message.success(editing ? "Brand updated" : "Brand created");
      setOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(payload.error || "Failed to delete brand");
      return;
    }
    message.success("Brand deleted");
    refresh();
  };

  return (
    <>
      <PageContainer
        title="Brands"
        subtitle="Tap a card to edit, or create new brands quickly"
        stickySlot={<SearchBar value={moduleSearch.brands} placeholder="Search brands" onChange={(value) => setModuleSearch("brands", value)} />}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No brands found" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {rows.map((brand) => (
              <Card key={brand.id} style={{ padding: 16, overflow: "hidden" }}>
                <button type="button" onClick={() => openEdit(brand)} style={{ border: 0, background: "transparent", width: "100%", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: "#fff4e6", color: "#d97706", display: "grid", placeItems: "center", fontSize: 20 }}>
                    {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.name} style={{ width: 28, height: 28, objectFit: "contain" }} /> : <TrademarkOutlined />}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{brand.name}</div>
                  <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>{brand.productCount} products</div>
                </button>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button type="button" onClick={() => openEdit(brand)} style={{ flex: 1, minHeight: 42, borderRadius: 12, border: "1px solid #dbe4f0", background: "#fff" }}>
                    <EditOutlined /> Edit
                  </button>
                  <button type="button" onClick={() => void handleDelete(brand.id)} style={{ minWidth: 52, minHeight: 42, borderRadius: 12, border: "1px solid #fecaca", color: "#dc2626", background: "#fff5f5" }}>
                    <DeleteOutlined />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
      <FloatingActionButton label="Add Brand" onClick={openCreate} />
      <Modal title={editing ? "Edit Brand" : "Create Brand"} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <BrandForm initialValues={editing} onSubmit={handleSubmit} onCancel={() => setOpen(false)} loading={saving} />
      </Modal>
    </>
  );
}
