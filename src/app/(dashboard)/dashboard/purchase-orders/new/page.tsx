"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Typography, Button, App, Skeleton, Alert } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import POForm from "@/modules/purchase-orders/components/POForm";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useStore } from "@/providers/StoreProvider";
import type { POItemFormValues } from "@/modules/purchase-orders/types";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { products, loading: productsLoading } = useProducts({ pageSize: 100 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: {
    supplierId: string;
    notes?: string;
    expectedDeliveryDate?: string;
    items: POItemFormValues[];
  }) => {
    if (!storeId) {
      message.error("Please select a store first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          storeId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Failed to create purchase order");
        return;
      }
      const po = await res.json();
      const recommendationId = searchParams.get("recommendationId");
      if (recommendationId)
        await fetch(`/api/replenishment/${encodeURIComponent(recommendationId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disposition: "ACCEPTED", linkedPurchaseOrderId: po.id }),
        });
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
      {searchParams.get("recommendationId") ? (
        <Alert
          showIcon
          type="info"
          message="Recommendation prefill"
          description="Review supplier, expected date, quantity and cost before creating this draft. The PO will not be submitted automatically."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {suppliersLoading || productsLoading ? (
        <Skeleton active />
      ) : (
        <POForm
          suppliers={suppliers}
          products={products}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/purchase-orders")}
          loading={saving}
          prefill={
            searchParams.get("productId") && searchParams.get("sizeId")
              ? {
                  productId: searchParams.get("productId")!,
                  sizeId: searchParams.get("sizeId")!,
                  quantity: Math.max(1, Number(searchParams.get("quantity") ?? 1)),
                  supplierId: searchParams.get("supplierId") ?? undefined,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
