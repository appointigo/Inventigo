"use client";

import { useState } from "react";
import { Table, InputNumber, Button, Space, Card, App, Input, DatePicker, Form } from "antd";
import dayjs from "dayjs";
import { CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrder, POItem, ReceivePOInput } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface POReceiveFormProps {
  purchaseOrder: PurchaseOrder;
  onReceive: (input: ReceivePOInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type ReceiveLine = POItem & {
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  rejectionReason?: string;
  unitCostActual: number;
};

export default function POReceiveForm({ purchaseOrder, onReceive, onCancel, loading }: POReceiveFormProps) {
  const { message } = App.useApp();
  const [lines, setLines] = useState<ReceiveLine[]>(
    purchaseOrder.items.map((item) => ({
      ...item,
      receivedQuantity: item.outstandingQuantity,
      acceptedQuantity: item.outstandingQuantity,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      unitCostActual: item.unitCost,
    }))
  );
  const [receivedAt, setReceivedAt] = useState(dayjs());
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmationId] = useState(() => crypto.randomUUID());

  const updateLine = (itemId: string, patch: Partial<ReceiveLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === itemId ? { ...l, ...patch } : l))
    );
  };

  const handleReceive = async () => {
    const itemsToReceive = lines
      .filter((l) => l.receivedQuantity > 0)
      .map((l) => ({
        purchaseOrderItemId: l.id,
        receivedQuantity: l.receivedQuantity, acceptedQuantity: l.acceptedQuantity,
        rejectedQuantity: l.rejectedQuantity, damagedQuantity: l.damagedQuantity,
        rejectionReason: l.rejectionReason, unitCostActual: l.unitCostActual,
      }));

    if (itemsToReceive.length === 0) {
      message.error("Enter received quantities for at least one item");
      return;
    }

    if (itemsToReceive.some((item) => item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity !== item.receivedQuantity)) { message.error("Accepted + rejected + damaged must equal received for every line"); return; }
    await onReceive({ confirmationId, items: itemsToReceive, receivedAt: receivedAt.toISOString(), supplierInvoiceNumber, notes });
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
      title: "Outstanding",
      dataIndex: "outstandingQuantity",
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
          max={1_000_000}
          value={record.receivedQuantity}
          onChange={(val) => updateLine(record.id, { receivedQuantity: val ?? 0 })}
          style={{ width: 80 }}
        />
      ),
    },
    { title: "Accepted", width: 105, render: (_, record) => <InputNumber min={0} max={record.outstandingQuantity} value={record.acceptedQuantity} onChange={(value) => updateLine(record.id, { acceptedQuantity: value ?? 0 })} style={{ width: 75 }} /> },
    { title: "Rejected", width: 105, render: (_, record) => <InputNumber min={0} max={record.receivedQuantity} value={record.rejectedQuantity} onChange={(value) => updateLine(record.id, { rejectedQuantity: value ?? 0 })} style={{ width: 75 }} /> },
    { title: "Damaged", width: 105, render: (_, record) => <InputNumber min={0} max={record.receivedQuantity} value={record.damagedQuantity} onChange={(value) => updateLine(record.id, { damagedQuantity: value ?? 0 })} style={{ width: 75 }} /> },
    { title: "Actual cost", width: 120, render: (_, record) => <InputNumber min={0} value={record.unitCostActual} onChange={(value) => updateLine(record.id, { unitCostActual: value ?? 0 })} style={{ width: 95 }} /> },
    { title: "Reason", width: 170, render: (_, record) => <Input value={record.rejectionReason} disabled={record.rejectedQuantity + record.damagedQuantity === 0} onChange={(event) => updateLine(record.id, { rejectionReason: event.target.value })} placeholder="Damage/rejection" /> },
  ];

  return (
    <Card title="Receive Purchase Order" size="small">
      <Form layout="inline" style={{ marginBottom: 16 }}><Form.Item label="Received at"><DatePicker showTime value={receivedAt} onChange={(value) => value && setReceivedAt(value)} /></Form.Item><Form.Item label="Supplier invoice"><Input value={supplierInvoiceNumber} onChange={(event) => setSupplierInvoiceNumber(event.target.value)} placeholder="Optional invoice number" /></Form.Item><Form.Item label="Notes"><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional receipt notes" /></Form.Item></Form>
      <p style={{ marginBottom: 16, color: "#666" }}>
        Record the complete receipt evidence. Only accepted quantity increases usable stock.
      </p>
      <Table
        columns={columns}
        dataSource={lines}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 1200 }}
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
