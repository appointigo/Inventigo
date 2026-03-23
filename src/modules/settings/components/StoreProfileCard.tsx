"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, Descriptions, Button, Form, Input, Space, Skeleton } from "antd";
import { App } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, ShopOutlined } from "@ant-design/icons";
import { useStore } from "@/providers/StoreProvider";
import type { StoreRecord, UpdateStoreInput } from "../types";

export default function StoreProfileCard() {
  const { message } = App.useApp();
  const { storeId, storeName, setStore } = useStore();
  const [store, setStoreData] = useState<StoreRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<UpdateStoreInput>();

  const fetchStore = useCallback(async () => {
    // Fallback: if no storeId in context, fetch the first active store
    const url = storeId ? `/api/stores/${encodeURIComponent(storeId)}` : "/api/stores";
    setLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const record: StoreRecord = Array.isArray(data)
          ? data.find((s: StoreRecord) => s.isActive) ?? data[0]
          : data;
        setStoreData(record);
      }
    } 
    catch (error) {
      console.error("Failed to fetch store:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const handleEdit = () => {
    if (!store) return;
    form.setFieldsValue({
      name: store.name,
      address: store.address ?? undefined,
      phone: store.phone ?? undefined,
    });
    setEditing(true);
  };

  const handleSave = async (values: UpdateStoreInput) => {
    if (!store) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(store.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }

      const updated: StoreRecord = await res.json();
      setStoreData(updated);

      // Sync store name in context if it changed
      if (updated.name !== storeName) {
        setStore(updated.id, updated.name);
      }

      message.success("Store profile updated");
      setEditing(false);
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Update failed");
    } 
    finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;

  return (
    <Card
      title={
        <Space>
          <ShopOutlined />
          <span>Store Profile</span>
        </Space>
      }
      extra={
        !editing ? (
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            Edit
          </Button>
        ) : (
          <Space>
            <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => form.submit()}
            >
              Save
            </Button>
          </Space>
        )
      }
      style={{ marginBottom: 24 }}
    >
      {editing ? (
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="Store Name"
            rules={[{ required: true, message: "Please enter a store name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
        </Form>
      ) : (
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Name">{store?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Code">{store?.code ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Phone" span={2}>{store?.phone ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{store?.address ?? "—"}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}
