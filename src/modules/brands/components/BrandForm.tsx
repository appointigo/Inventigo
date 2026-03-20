"use client";

import { useEffect } from "react";
import { Form, Input, Switch, Button, Space } from "antd";
import type { Brand, BrandFormValues } from "../types";

interface BrandFormProps {
  initialValues?: Brand | null;
  onSubmit: (values: BrandFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function BrandForm({ initialValues, onSubmit, onCancel, loading }: BrandFormProps) {
  const [form] = Form.useForm<BrandFormValues>();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        logoUrl: initialValues.logoUrl ?? undefined,
        isActive: initialValues.isActive,
      });
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={{ isActive: true }}
    >
      <Form.Item
        name="name"
        label="Brand Name"
        rules={[{ required: true, message: "Please enter a brand name" }]}
      >
        <Input placeholder="e.g. Nike" />
      </Form.Item>

      <Form.Item name="logoUrl" label="Logo URL">
        <Input placeholder="https://example.com/logo.png (optional)" />
      </Form.Item>

      <Form.Item name="isActive" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? "Update Brand" : "Create Brand"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
