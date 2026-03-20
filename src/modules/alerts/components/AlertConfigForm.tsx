"use client";

import { useEffect } from "react";
import { Modal, Form, InputNumber, Switch, Select } from "antd";
import type { AlertConfig, AlertConfigFormValues } from "../types";
import type { Product } from "@/modules/products/types";
import type { Category } from "@/modules/categories/types";

interface AlertConfigFormProps {
  open: boolean;
  editing: AlertConfig | null;
  products: Product[];
  categories: Category[];
  saving: boolean;
  onSubmit: (values: AlertConfigFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function AlertConfigForm({
  open,
  editing,
  products,
  categories,
  saving,
  onSubmit,
  onCancel,
}: AlertConfigFormProps) {
  const [form] = Form.useForm<AlertConfigFormValues>();

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          productId: editing.productId ?? undefined,
          categoryId: editing.categoryId ?? undefined,
          threshold: editing.threshold,
          notifyEmail: editing.notifyEmail,
          notifySMS: editing.notifySMS,
          isActive: editing.isActive,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ threshold: 5, notifyEmail: true, notifySMS: false, isActive: true });
      }
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={editing ? "Edit Alert Rule" : "New Alert Rule"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="productId"
          label="Product (optional — leave empty for broader scope)"
        >
          <Select
            allowClear
            placeholder="All products"
            showSearch={{ optionFilterProp: "label" }}
            options={products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
          />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Category (optional — leave empty for all categories)"
        >
          <Select
            allowClear
            placeholder="All categories"
            showSearch={{ optionFilterProp: "label" }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item
          name="threshold"
          label="Low Stock Threshold"
          rules={[{ required: true, message: "Threshold is required" }]}
          tooltip="Alert triggers when stock quantity is at or below this number"
        >
          <InputNumber min={0} max={1000} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="notifyEmail" label="Email Notifications" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="notifySMS" label="SMS Notifications" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
