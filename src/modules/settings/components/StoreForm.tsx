"use client";

import { useEffect } from "react";
import { Form, Input, Switch, Button, Space } from "antd";
import type { StoreRecord, CreateStoreInput, UpdateStoreInput } from "../types";

type StoreFormValues = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
};

interface StoreFormProps {
  initialValues?: StoreRecord | null;
  onSubmit: (values: CreateStoreInput | UpdateStoreInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function StoreForm({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: StoreFormProps) {
  const [form] = Form.useForm<StoreFormValues>();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        code: initialValues.code,
        address: initialValues.address ?? undefined,
        phone: initialValues.phone ?? undefined,
        isActive: initialValues.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEdit) {
      const code = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 10);
      form.setFieldValue("code", code);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        name="name"
        label="Store Name"
        rules={[{ required: true, message: "Please enter a store name" }]}
      >
        <Input placeholder="e.g. Main Store" onChange={handleNameChange} />
      </Form.Item>

      <Form.Item
        name="code"
        label="Store Code"
        rules={[{ required: true, message: "Please enter a store code" }]}
        extra="Unique short code (e.g. MAIN, BRANCH1). Auto-generated from name."
      >
        <Input
          placeholder="e.g. MAIN"
          disabled={isEdit}
          style={{ textTransform: "uppercase" }}
        />
      </Form.Item>

      <Form.Item name="address" label="Address">
        <Input.TextArea rows={2} placeholder="Store address (optional)" />
      </Form.Item>

      <Form.Item name="phone" label="Phone">
        <Input placeholder="+91-XXXXXXXXXX (optional)" />
      </Form.Item>

      {isEdit && (
        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? "Update Store" : "Create Store"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
