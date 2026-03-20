"use client";

import { useState } from "react";
import { Modal, Form, InputNumber, Select, Input, Typography, Space, Tag } from "antd";
import type { MockStockRow } from "../services/mockStockService";

interface StockAdjustmentModalProps {
  stockRow: MockStockRow | null;
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    productId: string;
    sizeId: string;
    quantity: number;
    type: "IN" | "OUT" | "ADJUSTMENT";
    reason?: string;
  }) => Promise<void>;
}

export default function StockAdjustmentModal({
  stockRow,
  open,
  onCancel,
  onSubmit,
}: StockAdjustmentModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSubmit({
        productId: stockRow!.productId,
        sizeId: stockRow!.sizeId,
        quantity: values.quantity,
        type: values.type,
        reason: values.reason,
      });
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Adjust Stock"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Apply"
      destroyOnHidden
    >
      {stockRow && (
        <>
          <Space orientation="vertical" style={{ width: "100%", marginBottom: 16 }}>
            <Typography.Text strong>{stockRow.productName}</Typography.Text>
            <Space>
              <Tag color="blue">{stockRow.sizeLabel}</Tag>
              <Typography.Text type="secondary">Current: {stockRow.quantity}</Typography.Text>
            </Space>
          </Space>

          <Form form={form} layout="vertical" initialValues={{ type: "ADJUSTMENT" }}>
            <Form.Item
              name="type"
              label="Adjustment Type"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: "Stock In (received)", value: "IN" },
                  { label: "Stock Out (removed)", value: "OUT" },
                  { label: "Adjustment (+/-)", value: "ADJUSTMENT" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[{ required: true, message: "Enter quantity" }]}
            >
              <InputNumber style={{ width: "100%" }} placeholder="Enter quantity" />
            </Form.Item>

            <Form.Item name="reason" label="Reason">
              <Select
                placeholder="Select or type a reason"
                allowClear
                mode="tags"
                maxCount={1}
                options={[
                  { label: "Stock recount", value: "Stock recount" },
                  { label: "Damaged items", value: "Damaged items" },
                  { label: "Received from supplier", value: "Received from supplier" },
                  { label: "Customer return", value: "Customer return" },
                  { label: "Inventory correction", value: "Inventory correction" },
                ]}
              />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
