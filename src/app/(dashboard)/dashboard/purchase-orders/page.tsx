"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Typography } from "antd";
import type { PurchaseOrderStatus } from "@prisma/client";
import POTable from "@/modules/purchase-orders/components/POTable";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useStore } from "@/providers/StoreProvider";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeId } = useStore();
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | undefined>(() =>
    searchParams.get("view") === "receiving" ? "ORDERED" : undefined
  );
  const [supplierFilter, setSupplierFilter] = useState<string | undefined>();

  const { purchaseOrders, loading } = usePurchaseOrders({
    supplierId: supplierFilter,
    storeId: storeId ?? undefined,
  });
  const { suppliers } = useSuppliers();

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>Purchases &nbsp;/&nbsp; Purchase Orders</div>
      <div className={styles.header}><div>
        <Typography.Title level={2} className={styles.title}>Purchase Orders</Typography.Title>
        <p className={styles.subtitle}>Create and manage purchase orders with suppliers.</p>
      </div></div>
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
    </main>
  );
}
