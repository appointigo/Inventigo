"use client";

import { useState, useCallback } from "react";
import { Typography, Tabs, App } from "antd";
import AlertConfigTable from "@/modules/alerts/components/AlertConfigTable";
import AlertConfigForm from "@/modules/alerts/components/AlertConfigForm";
import LowStockAlertsList from "@/modules/alerts/components/LowStockAlertsList";
import { useAlertConfigs, useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import type { AlertConfig, AlertConfigFormValues } from "@/modules/alerts/types";

const { Title } = Typography;

export default function AlertsPage() {
  const { message } = App.useApp();
  const { configs, loading, refresh } = useAlertConfigs();
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts();
  const { products } = useProducts({});
  const { categories } = useCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlertConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (config: AlertConfig) => {
    setEditing(config);
    setModalOpen(true);
  };

  const handleSubmit = async (values: AlertConfigFormValues) => {
    setSaving(true);
    try {
      const url = editing ? `/api/alerts/${encodeURIComponent(editing.id)}` : "/api/alerts";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save");
      message.success(editing ? "Alert rule updated" : "Alert rule created");
      setModalOpen(false);
      refresh();
    } catch {
      message.error("Failed to save alert rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Alert rule deleted");
        refresh();
      } else {
        message.error("Failed to delete alert rule");
      }
    },
    [message, refresh]
  );

  const handleToggleActive = useCallback(
    async (config: AlertConfig) => {
      const res = await fetch(`/api/alerts/${encodeURIComponent(config.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !config.isActive }),
      });
      if (res.ok) {
        message.success(`Alert rule ${config.isActive ? "disabled" : "enabled"}`);
        refresh();
      } else {
        message.error("Failed to update alert rule");
      }
    },
    [message, refresh]
  );

  const tabItems = [
    {
      key: "low-stock",
      label: `Low Stock (${lowStockItems.length})`,
      children: (
        <LowStockAlertsList items={lowStockItems} loading={lowStockLoading} />
      ),
    },
    {
      key: "config",
      label: "Alert Rules",
      children: (
        <AlertConfigTable
          configs={configs}
          loading={loading}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        Alerts & Reorder
      </Title>

      <Tabs items={tabItems} defaultActiveKey="low-stock" />

      <AlertConfigForm
        open={modalOpen}
        editing={editing}
        products={products}
        categories={categories}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
