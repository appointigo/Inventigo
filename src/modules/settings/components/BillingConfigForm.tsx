"use client";

import { useEffect } from "react";
import { Form, InputNumber, Input, Button, Card, Skeleton, Space, Divider } from "antd";
import { App } from "antd";
import { PercentageOutlined, SaveOutlined } from "@ant-design/icons";
import { useAppSettings } from "../hooks/useAppSettings";
import type { BillingConfig } from "../types";

export default function BillingConfigForm() {
  const { message } = App.useApp();
  const { settings, loading, updateBillingConfig } = useAppSettings();
  const [form] = Form.useForm<BillingConfig>();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings.billingConfig);
    }
  }, [settings, form]);

  const handleFinish = async (values: BillingConfig) => {
    try {
      await updateBillingConfig(values);
      message.success("Billing config saved");
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

  return (
    <Card title="Billing Configuration" style={{ maxWidth: 480 }}>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="invoicePrefix"
          label="Invoice Number Prefix"
          extra='Prepended to all invoice numbers (e.g. "INV" → INV-20250101-0001)'
          rules={[{ required: true, message: "Please enter a prefix" }]}
        >
          <Input
            placeholder="INV"
            maxLength={10}
            style={{ textTransform: "uppercase", maxWidth: 160 }}
          />
        </Form.Item>

        <Divider />

        <Form.Item
          name="taxRate"
          label="Tax Rate"
          extra="Applied to all sales as a percentage of the subtotal"
          rules={[{ required: true, message: "Please enter a tax rate" }]}
        >
          <InputNumber
            min={0}
            max={100}
            precision={2}
            suffix={<PercentageOutlined />}
            style={{ width: 160 }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              Save Configuration
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
