"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Segmented, Table, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useStore } from "@/providers/StoreProvider";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { formatDate } from "@/shared/utils/formatDate";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

export default function ReceivingQueuePage() {
  const router = useRouter(); const { storeId } = useStore();
  const { purchaseOrders, loading } = usePurchaseOrders({ storeId: storeId ?? undefined });
  const [view, setView] = useState("All"); const [search, setSearch] = useState("");
  const rows = useMemo(() => purchaseOrders.filter((po) => ["ORDERED", "PARTIALLY_RECEIVED"].includes(po.status)).filter((po) => !search || `${po.poNumber} ${po.supplierName}`.toLowerCase().includes(search.toLowerCase())).filter((po) => {
    const now = new Date(); const week = new Date(now.getTime() + 7 * 86_400_000);
    if (view === "All") return true; if (!po.expectedDeliveryDate) return view === "Due Later";
    const date = new Date(po.expectedDeliveryDate); if (view === "Overdue") return date < now; if (view === "Due This Week") return date >= now && date <= week; return date > week;
  }), [purchaseOrders, search, view]);
  return <main className={styles.page}><div className={styles.breadcrumb}>Purchases &nbsp;/&nbsp; Goods Receiving</div><div className={styles.header}><div><Typography.Title level={2} className={styles.title}>Goods Receiving Queue</Typography.Title><p className={styles.subtitle}>Purchase orders awaiting delivery or receipt confirmation.</p></div></div>
    <section className={styles.panel}><div className={styles.toolbar}><Segmented value={view} onChange={(value) => setView(String(value))} options={["All", "Overdue", "Due This Week", "Due Later"]} /><Input prefix={<SearchOutlined />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="PO number or supplier" style={{ width: 260 }} /></div><div className={styles.tableWrap}><Table loading={loading} rowKey="id" dataSource={rows} scroll={{ x: 980 }} columns={[
      { title: "PO Number", dataIndex: "poNumber" }, { title: "Supplier", dataIndex: "supplierName" }, { title: "Store", dataIndex: "storeName" },
      { title: "Pending Quantity", render: (_, row) => row.items.reduce((sum: number, item: { outstandingQuantity: number }) => sum + item.outstandingQuantity, 0) },
      { title: "Expected Date", dataIndex: "expectedDeliveryDate", render: (value) => value ? <Tag color={new Date(value) < new Date() ? "red" : "blue"}>{formatDate(value)}</Tag> : "Not set" },
      { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "PARTIALLY_RECEIVED" ? "gold" : "blue"}>{value.replaceAll("_", " ")}</Tag> },
      { title: "Action", fixed: "right", render: (_, row) => <Button type="primary" onClick={() => router.push(`/dashboard/purchase-orders/${row.id}?receive=1`)}>Start Receiving</Button> },
    ]} /></div></section>
  </main>;
}
