"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "antd";
import type { PurchaseOrderStatus } from "@prisma/client";
import POTable from "@/modules/purchase-orders/components/POTable";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | undefined>();
  const [supplierFilter, setSupplierFilter] = useState<string | undefined>();

  const { purchaseOrders, loading } = usePurchaseOrders({
    status: statusFilter,
    supplierId: supplierFilter,
  });
  const { suppliers } = useSuppliers();

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 24 }}>
        Purchase Orders
      </Typography.Title>
      <POTable
        purchaseOrders={purchaseOrders}
        suppliers={suppliers}
        loading={loading}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        supplierFilter={supplierFilter}
        onSupplierChange={setSupplierFilter}
        onAdd={() => router.push("/dashboard/purchase-orders/new")}
        onView={(po) => router.push(`/dashboard/purchase-orders/${po.id}`)}
      />
    </div>
  );
}
