"use client";

import { useState, useCallback } from "react";
import { Typography, Modal, message } from "antd";
import BrandTable from "@/modules/brands/components/BrandTable";
import BrandForm from "@/modules/brands/components/BrandForm";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import type { Brand, BrandFormValues } from "@/modules/brands/types";

export default function BrandsPage() {
  const { brands, loading, refresh } = useBrands();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setModalOpen(true);
  };

  const handleSubmit = async (values: BrandFormValues) => {
    setSaving(true);
    try {
      const url = editing
        ? `/api/brands/${encodeURIComponent(editing.id)}`
        : "/api/brands";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to save");
        return;
      }
      message.success(editing ? "Brand updated" : "Brand created");
      setModalOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to delete");
        return;
      }
      message.success("Brand deleted");
      refresh();
    },
    [refresh]
  );

  const handleToggleActive = useCallback(
    async (brand: Brand) => {
      const res = await fetch(`/api/brands/${encodeURIComponent(brand.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      if (res.ok) refresh();
    },
    [refresh]
  );

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Brands
      </Typography.Title>
      <BrandTable
        brands={brands}
        loading={loading}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
      <Modal
        title={editing ? "Edit Brand" : "New Brand"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <BrandForm
          initialValues={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
