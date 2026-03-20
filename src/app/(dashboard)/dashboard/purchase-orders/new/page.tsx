"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Button, App } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import POForm from "@/modules/purchase-orders/components/POForm";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { POItemFormValues } from "@/modules/purchase-orders/types";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: {
    supplierId: string;
    notes?: string;
    items: POItemFormValues[];
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          storeId: "store-1", // Default store
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to create purchase order");
        return;
      }
      const po = await res.json();
      message.success("Purchase order created");
      router.push(`/dashboard/purchase-orders/${po.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/dashboard/purchase-orders")}
        style={{ marginBottom: 16 }}
      >
        Back to Purchase Orders
      </Button>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        New Purchase Order
      </Typography.Title>
      <POForm
        suppliers={suppliers}
        products={products}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/dashboard/purchase-orders")}
        loading={saving}
      />
    </div>
  );
}
