"use client";

import { useEffect, useState } from "react";
import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useStore } from "@/providers/StoreProvider";
import styles from "@/modules/purchase-orders/components/PurchaseWorkspace.module.css";

type Claim = { id: string; claimNumber: string; status: string; requestedResolution: string; quantity: number; createdAt: string; supplier: { name: string }; discrepancy: { discrepancyNumber: string; reason: string; purchaseOrder: { poNumber: string }; receipt: { receiptNumber: string } } };
type Discrepancy = { id: string; discrepancyNumber: string; quantity: number; reason: string; status: string; purchaseOrderItem: { productNameSnapshot: string } };

export default function ClaimsPage() {
  const { message } = App.useApp(); const { storeId } = useStore(); const [claims, setClaims] = useState<Claim[]>([]); const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]); const [open, setOpen] = useState(false); const [form] = Form.useForm();
  const load = async () => { const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""; const [claimRows, issueRows] = await Promise.all([fetch(`/api/purchasing/claims${query}`).then((r) => r.ok ? r.json() : []), fetch(`/api/purchasing/discrepancies${query}`).then((r) => r.ok ? r.json() : [])]); setClaims(claimRows); setDiscrepancies(issueRows); };
  useEffect(() => {
    const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
    void Promise.all([
      fetch(`/api/purchasing/claims${query}`).then((response) => response.ok ? response.json() : []),
      fetch(`/api/purchasing/discrepancies${query}`).then((response) => response.ok ? response.json() : []),
    ]).then(([claimRows, issueRows]) => { setClaims(claimRows); setDiscrepancies(issueRows); });
  }, [storeId]);
  const create = async () => { const values = await form.validateFields(); const response = await fetch("/api/purchasing/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, expectedReplacementAt: values.expectedReplacementAt?.format("YYYY-MM-DD") }) }); const result = await response.json(); if (!response.ok) return message.error(result.error || "Unable to create claim"); message.success("Supplier claim created"); setOpen(false); form.resetFields(); await load(); };
  return <main className={styles.page}><div className={styles.breadcrumb}>Purchases &nbsp;/&nbsp; Supplier Claims & Returns</div><div className={styles.header}><div><Typography.Title level={2} className={styles.title}>Supplier Claims & Returns</Typography.Title><p className={styles.subtitle}>Trace returns, replacements and credits to original receipt evidence.</p></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New Claim</Button></div><section className={styles.panel}><div className={styles.tableWrap}><Table rowKey="id" dataSource={claims} scroll={{ x: 1050 }} columns={[
    { title: "Claim Number", dataIndex: "claimNumber" }, { title: "PO Number", dataIndex: ["discrepancy", "purchaseOrder", "poNumber"] }, { title: "Receipt", dataIndex: ["discrepancy", "receipt", "receiptNumber"] }, { title: "Supplier", dataIndex: ["supplier", "name"] }, { title: "Quantity", dataIndex: "quantity" }, { title: "Defect Reason", dataIndex: ["discrepancy", "reason"] }, { title: "Resolution", dataIndex: "requestedResolution", render: (value) => <Tag color="blue">{value.replaceAll("_", " ")}</Tag> }, { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "RESOLVED" ? "green" : "gold"}>{value.replaceAll("_", " ")}</Tag> },
  ]} /></div></section><Modal open={open} title="New supplier claim" onCancel={() => setOpen(false)} onOk={create}><Form form={form} layout="vertical"><Form.Item name="discrepancyId" label="Receipt discrepancy" rules={[{ required: true }]}><Select options={discrepancies.filter((item) => item.status === "OPEN").map((item) => ({ value: item.id, label: `${item.discrepancyNumber} · ${item.purchaseOrderItem.productNameSnapshot} · ${item.quantity}` }))} /></Form.Item><Form.Item name="requestedResolution" label="Requested resolution" rules={[{ required: true }]}><Select options={[{ value: "RETURN", label: "Return to Supplier" }, { value: "REPLACEMENT", label: "Request Replacement" }, { value: "CREDIT_NOTE", label: "Request Credit Note" }]} /></Form.Item><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item><Form.Item name="expectedReplacementAt" label="Expected replacement date"><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="returnAuthorization" label="Return authorization"><Input /></Form.Item><Form.Item name="notes" label="Notes"><Input.TextArea /></Form.Item></Form></Modal></main>;
}
