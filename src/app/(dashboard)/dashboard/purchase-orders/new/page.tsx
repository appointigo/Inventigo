"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Typography, Button, App, Skeleton, Alert, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import POForm from "@/modules/purchase-orders/components/POForm";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useStore } from "@/providers/StoreProvider";
import type { PurchaseOrderLineInput } from "@/modules/purchase-orders/types";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { storeId } = useStore();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { categories, loading: categoriesLoading } = useCategories();
  const { brands, loading: brandsLoading } = useBrands();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: {
    supplierId: string;
    notes?: string; deliveryInstructions?: string; orderDate: string;
    expectedDeliveryDate?: string;
    items: PurchaseOrderLineInput[];
  }, issue: boolean) => {
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
      if (issue) {
        const issueResponse = await fetch(`/api/purchase-orders/${encodeURIComponent(po.id)}/submit`, { method: "POST" });
        if (!issueResponse.ok) {
          const data = await issueResponse.json();
          message.warning(`Draft saved, but issuing failed: ${data.error || "Unknown error"}`);
          router.push(`/dashboard/purchase-orders/${po.id}`);
          return;
        }
      }
      const recommendationId = searchParams.get("recommendationId");
      if (recommendationId)
        await fetch(`/api/replenishment/${encodeURIComponent(recommendationId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disposition: "ACCEPTED", linkedPurchaseOrderId: po.id }),
        });
      message.success(issue ? "Purchase order issued" : "Purchase order saved as draft");
      router.push(`/dashboard/purchase-orders/${po.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}><div><Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/dashboard/purchase-orders")}
        style={{ marginBottom: 12 }}
      >
        Back to Purchase Orders
      </Button><Typography.Title level={2} className={styles.title}>Create Purchase Order</Typography.Title><p className={styles.subtitle}>Order catalog products, create a product without stock, or describe unknown supplier goods provisionally.</p></div><Space /></div>
      {searchParams.get("recommendationId") ? (
        <Alert
          showIcon
          type="info"
          message="Recommendation prefill"
          description="Review supplier, expected date, quantity and cost before creating this draft. The PO will not be submitted automatically."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {suppliersLoading || categoriesLoading || brandsLoading || !storeId ? (
        <Skeleton active />
      ) : (
        <POForm
          suppliers={suppliers}
          storeId={storeId}
          categories={categories}
          brands={brands}
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
    </main>
  );
}
