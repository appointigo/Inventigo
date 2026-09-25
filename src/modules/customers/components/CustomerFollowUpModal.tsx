"use client";

import { useEffect, useState } from "react";
import { App, DatePicker, Form, Input, Modal, Select } from "antd";
import type { CustomerDetailDto } from "../types";

type Option = { id: string; name: string; storeId?: string | null; isActive?: boolean };

export default function CustomerFollowUpModal({ open, customer, currentStoreId, onClose, onSaved }: { open: boolean; customer: CustomerDetailDto | null; currentStoreId: string | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const storeId = Form.useWatch("storeId", form);

  useEffect(() => {
    if (!open || !customer) return;
    form.setFieldsValue({ storeId: customer.preferredStoreId || currentStoreId, type: "GENERAL", priority: "NORMAL", status: "OPEN", title: `Follow up with ${customer.name || customer.mobile}` });
    Promise.all([fetch("/api/stores").then(r => r.ok ? r.json() : []), fetch("/api/team").then(r => r.ok ? r.json() : [])]).then(([nextStores, nextUsers]) => { setStores(nextStores); setUsers(nextUsers); }).catch(() => undefined);
  }, [customer, currentStoreId, form, open]);

  const save = async () => {
    if (!customer || saving) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const response = await fetch("/api/customer-follow-ups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, customerId: customer.id, dueAt: values.dueAt?.toISOString() ?? null }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to create follow-up");
      message.success("Follow-up created");
      form.resetFields();
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : "Unable to create follow-up"); }
    finally { setSaving(false); }
  };

  return <Modal title="Create Customer Follow-up" open={open} onCancel={saving ? undefined : onClose} onOk={save} okText="Create Follow-up" confirmLoading={saving} destroyOnHidden>
    {customer ? <div style={{ marginBottom: 16 }}><strong>{customer.name || "Unnamed customer"}</strong><div style={{ color: "#6b7280" }}>{customer.mobile}</div></div> : null}
    <Form form={form} layout="vertical" preserve>
      <Form.Item name="storeId" label="Responsible store" rules={[{ required: true }]}><Select options={stores.map(item => ({ value: item.id, label: item.name }))} /></Form.Item>
      <Form.Item name="assignedUserId" label="Assigned staff"><Select allowClear showSearch optionFilterProp="label" options={users.filter(item => item.isActive !== false && (!storeId || !item.storeId || item.storeId === storeId)).map(item => ({ value: item.id, label: item.name }))} /></Form.Item>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={["GENERAL", "REPEAT_PURCHASE", "AT_RISK", "RESTOCK", "RETURN_RESOLUTION", "OTHER"].map(value => ({ value, label: value.replaceAll("_", " ") }))} /></Form.Item>
        <Form.Item name="priority" label="Priority" rules={[{ required: true }]}><Select options={["LOW", "NORMAL", "HIGH"].map(value => ({ value, label: value }))} /></Form.Item>
      </div>
      <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }]}><Input maxLength={160} /></Form.Item>
      <Form.Item name="description" label="Description"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
      <Form.Item name="demandRequestId" label="Related demand request"><Select allowClear options={customer?.demandRequests.map(item => ({ value: item.id, label: `${item.requirement} · ${item.reason.replaceAll("_", " ")}` }))} /></Form.Item>
      <Form.Item name="dueAt" label="Due date and time"><DatePicker showTime style={{ width: "100%" }} /></Form.Item>
      <Form.Item name="note" label="Notes"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
    </Form>
  </Modal>;
}
