"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Typography, Modal, App } from "antd";
import SupplierTable from "@/modules/suppliers/components/SupplierTable";
import SupplierForm from "@/modules/suppliers/components/SupplierForm";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import type { Supplier, SupplierFormValues } from "@/modules/suppliers/types";

export default function SuppliersPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { suppliers, loading, refresh } = useSuppliers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setModalOpen(true);
  };

  const handleSubmit = async (values: SupplierFormValues) => {
    setSaving(true);
    try {
      const url = editing
        ? `/api/suppliers/${encodeURIComponent(editing.id)}`
        : "/api/suppliers";
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
      message.success(editing ? "Supplier updated" : "Supplier created");
      setModalOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to delete");
        return;
      }
      message.success("Supplier deleted");
      refresh();
    },
    [refresh]
  );

  const handleToggleActive = useCallback(
    async (supplier: Supplier) => {
      const res = await fetch(`/api/suppliers/${encodeURIComponent(supplier.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      if (res.ok) refresh();
    },
    [refresh]
  );

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Suppliers
      </Typography.Title>
      <SupplierTable
        suppliers={suppliers}
        loading={loading}
        onAdd={openAdd}
        onView={(s) => router.push(`/dashboard/suppliers/${s.id}`)}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
      <Modal
        title={editing ? "Edit Supplier" : "New Supplier"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <SupplierForm
          initialValues={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
