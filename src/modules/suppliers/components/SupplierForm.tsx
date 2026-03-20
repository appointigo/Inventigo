"use client";

import { useEffect } from "react";
import { Form, Input, Switch, Button, Space } from "antd";
import type { Supplier, SupplierFormValues } from "../types";

interface SupplierFormProps {
  initialValues?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function SupplierForm({ initialValues, onSubmit, onCancel, loading }: SupplierFormProps) {
  const [form] = Form.useForm<SupplierFormValues>();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        contactPerson: initialValues.contactPerson ?? undefined,
        email: initialValues.email ?? undefined,
        phone: initialValues.phone ?? undefined,
        address: initialValues.address ?? undefined,
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
        label="Supplier Name"
        rules={[{ required: true, message: "Please enter a supplier name" }]}
      >
        <Input placeholder="e.g. FashionHub Wholesale" />
      </Form.Item>

      <Form.Item name="contactPerson" label="Contact Person">
        <Input placeholder="e.g. Rajesh Kumar" />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[{ type: "email", message: "Please enter a valid email" }]}
      >
        <Input placeholder="e.g. contact@supplier.com" />
      </Form.Item>

      <Form.Item name="phone" label="Phone">
        <Input placeholder="e.g. +91 98765 43210" />
      </Form.Item>

      <Form.Item name="address" label="Address">
        <Input.TextArea rows={2} placeholder="Full address" />
      </Form.Item>

      <Form.Item name="isActive" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? "Update Supplier" : "Create Supplier"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
