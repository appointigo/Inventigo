"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Segmented, Table, Tag, Typography } from "antd";
import { useStore } from "@/providers/StoreProvider";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

type Discrepancy = { id: string; discrepancyNumber: string; issueType: string; quantity: number; reason: string; photoUrls: string[]; status: string; purchaseOrder: { poNumber: string }; receipt: { receiptNumber: string }; purchaseOrderItem: { productNameSnapshot: string; sizeLabelSnapshot: string } };

export default function InspectionPage() {
  const { storeId } = useStore(); const [rows, setRows] = useState<Discrepancy[]>([]); const [tab, setTab] = useState("All");
  useEffect(() => { const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""; void fetch(`/api/purchasing/discrepancies${query}`).then((r) => r.ok ? r.json() : []).then(setRows); }, [storeId]);
  const visible = useMemo(() => rows.filter((row) => tab === "All" || (tab === "Damaged" ? row.issueType === "DAMAGED" : tab === "Wrong Item" ? row.issueType === "WRONG_ITEM" : row.status === "OPEN")), [rows, tab]);
  return <main className={styles.page}><div className={styles.breadcrumb}>Purchases &nbsp;/&nbsp; Inspection & Defects</div><div className={styles.header}><div><Typography.Title level={2} className={styles.title}>Inspection & Defects</Typography.Title><p className={styles.subtitle}>Review held, damaged and incorrect goods without making them sellable.</p></div></div><Alert showIcon type="info" message="Inspection policy is category and store configurable. Quick receiving remains available when formal inspection is not required." style={{ marginBottom: 16 }} /><section className={styles.panel}><div className={styles.toolbar}><Segmented value={tab} onChange={(value) => setTab(String(value))} options={["All", "Held for Inspection", "Damaged", "Wrong Item"]} /></div><div className={styles.tableWrap}><Table rowKey="id" dataSource={visible} scroll={{ x: 1050 }} columns={[
    { title: "Reference", dataIndex: "discrepancyNumber" }, { title: "PO / Receipt", render: (_, row) => <div>{row.purchaseOrder.poNumber}<br/><small>{row.receipt.receiptNumber}</small></div> }, { title: "Product / Variant", render: (_, row) => `${row.purchaseOrderItem.productNameSnapshot} · ${row.purchaseOrderItem.sizeLabelSnapshot}` },
    { title: "Affected Qty", dataIndex: "quantity" }, { title: "Condition", dataIndex: "issueType", render: (value) => <Tag color={value === "DAMAGED" ? "red" : "gold"}>{value.replaceAll("_", " ")}</Tag> }, { title: "Defect reason", dataIndex: "reason" },
    { title: "Photos", dataIndex: "photoUrls", render: (urls: string[]) => urls.length ? <Image.PreviewGroup>{urls.map((url) => <Image key={url} src={url} width={38} height={38} alt="Defect evidence" />)}</Image.PreviewGroup> : "—" }, { title: "Status", dataIndex: "status", render: (value) => <Tag>{value}</Tag> },
  ]} /></div></section></main>;
}
