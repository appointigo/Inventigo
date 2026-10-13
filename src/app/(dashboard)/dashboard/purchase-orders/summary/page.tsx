"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Space, Table, Tag, Typography } from "antd";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

type Summary = { openPurchaseOrders: number; inboundStockValue: number; outstandingPayables: number; pendingClaims: number; totalBilled: number; credits: number };
type Payable = { id: string; supplier: { name: string }; originalAmount: number; paidAmount: number; outstandingAmount: number; dueDate: string | null; status: string; purchaseOrderId: string | null; billId: string | null };

export default function PurchaseSummaryPage() {
  const router = useRouter(); const { storeId } = useStore(); const [summary, setSummary] = useState<Summary>(); const [payables, setPayables] = useState<Payable[]>([]);
  useEffect(() => { const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""; void Promise.all([fetch(`/api/purchasing/summary${query}`).then((r) => r.json()), fetch(`/api/finance/payables${query}`).then((r) => r.json())]).then(([a, b]) => { setSummary(a); setPayables(Array.isArray(b) ? b : []); }); }, [storeId]);
  return <main className={styles.page}><div className={styles.breadcrumb}>Purchases &nbsp;/&nbsp; Payments & Summary</div><div className={styles.header}><div><Typography.Title level={2} className={styles.title}>Payments & Purchase Summary</Typography.Title><p className={styles.subtitle}>Supplier obligations and actual settlements remain separate from inventory receipts.</p></div><Button type="primary" onClick={() => router.push("/dashboard/expenses/finance")}>Open Finance</Button></div><div className={styles.kpiGrid}>{[
    ["Open Purchase Orders", summary?.openPurchaseOrders ?? 0], ["Inbound Stock Value", formatCurrency(summary?.inboundStockValue ?? 0)], ["Outstanding Supplier Payables", formatCurrency(summary?.outstandingPayables ?? 0)], ["Pending Claims", summary?.pendingClaims ?? 0],
  ].map(([label, value]) => <section key={label} className={`${styles.panel} ${styles.kpi}`}><div className={styles.kpiLabel}>{label}</div><div className={styles.kpiValue}>{value}</div></section>)}</div><section className={styles.panel}><div className={styles.toolbar}><strong>Supplier payables</strong><Space><span>Total billed: {formatCurrency(summary?.totalBilled ?? 0)}</span><span>Credits: {formatCurrency(summary?.credits ?? 0)}</span></Space></div><div className={styles.tableWrap}><Table rowKey="id" dataSource={payables} scroll={{ x: 950 }} columns={[
    { title: "Supplier", dataIndex: ["supplier", "name"] }, { title: "Total Amount", dataIndex: "originalAmount", render: formatCurrency }, { title: "Paid Amount", dataIndex: "paidAmount", render: formatCurrency }, { title: "Outstanding", dataIndex: "outstandingAmount", render: (value) => <strong>{formatCurrency(value)}</strong> }, { title: "Due Date", dataIndex: "dueDate", render: (value) => value ? new Date(value).toLocaleDateString("en-IN") : "Not set" }, { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "PAID" ? "green" : "gold"}>{value.replaceAll("_", " ")}</Tag> }, { title: "Actions", fixed: "right", render: (_, row) => <Space><Button size="small" type="primary" disabled={row.outstandingAmount <= 0} onClick={() => router.push("/dashboard/expenses/finance")}>Record Payment</Button>{row.purchaseOrderId && <Button size="small" onClick={() => router.push(`/dashboard/purchase-orders/${row.purchaseOrderId}`)}>View PO</Button>}</Space> },
  ]} /></div></section></main>;
}
