"use client";

import { useState } from "react";
import { Table, InputNumber, Button, Space, Card, App } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrder, POItem, ReceiveItemInput } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface POReceiveFormProps {
  purchaseOrder: PurchaseOrder;
  onReceive: (items: ReceiveItemInput[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type ReceiveLine = POItem & {
  receivedQuantity: number;
};

export default function POReceiveForm({ purchaseOrder, onReceive, onCancel, loading }: POReceiveFormProps) {
  const { message } = App.useApp();
  const [lines, setLines] = useState<ReceiveLine[]>(
    purchaseOrder.items.map((item) => ({
      ...item,
      receivedQuantity: item.quantity, // Default to ordered quantity
    }))
  );

  const updateQuantity = (itemId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === itemId ? { ...l, receivedQuantity: qty } : l))
    );
  };

  const handleReceive = async () => {
    const itemsToReceive = lines
      .filter((l) => l.receivedQuantity > 0)
      .map((l) => ({
        purchaseOrderItemId: l.id,
        receivedQuantity: l.receivedQuantity,
      }));

    if (itemsToReceive.length === 0) {
      message.error("Enter received quantities for at least one item");
      return;
    }

    await onReceive(itemsToReceive);
  };

  const columns: ColumnsType<ReceiveLine> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName}</div>
          <div style={{ color: "#888", fontSize: 12 }}>{record.productSku}</div>
        </div>
      ),
    },
    {
      title: "Size",
      dataIndex: "sizeLabel",
      width: 80,
      align: "center",
    },
    {
      title: "Ordered",
      dataIndex: "quantity",
      width: 100,
      align: "center",
    },
    {
      title: "Unit Cost",
      dataIndex: "unitCost",
      width: 120,
      align: "right",
      render: (val: number) => formatCurrency(val),
    },
    {
      title: "Received Qty",
      key: "received",
      width: 130,
      align: "center",
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.quantity * 2} // Allow slight over-delivery
          value={record.receivedQuantity}
          onChange={(val) => updateQuantity(record.id, val ?? 0)}
          style={{ width: 80 }}
        />
      ),
    },
  ];

  return (
    <Card title="Receive Purchase Order" size="small">
      <p style={{ marginBottom: 16, color: "#666" }}>
        Enter the actual received quantity for each item. Items with 0 received quantity will not update stock.
      </p>
      <Table
        columns={columns}
        dataSource={lines}
        rowKey="id"
        pagination={false}
        size="small"
      />
      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleReceive}
            loading={loading}
          >
            Confirm Receipt
          </Button>
        </Space>
      </div>
    </Card>
  );
}
