"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, InputNumber, Select, Typography } from "antd";
import type { PaymentMethodType, SplitPaymentEntry } from "@/modules/billing/types";

const PAYMENT_OPTIONS: Array<{ value: PaymentMethodType; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
];

export function SplitPaymentPanel({
  entries,
  totalDue,
  onEntriesChange,
}: {
  entries: SplitPaymentEntry[];
  totalDue: number;
  onEntriesChange: (entries: SplitPaymentEntry[]) => void;
}) {
  const totalEntered = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = totalDue - totalEntered;
  const isComplete = Math.abs(totalEntered - totalDue) < 0.01; // Account for floating point precision

  const handleAddEntry = () => {
    onEntriesChange([...entries, { method: "CASH", amount: 0 }]);
  };

  const handleRemoveEntry = (index: number) => {
    onEntriesChange(entries.filter((_, i) => i !== index));
  };

  const handleMethodChange = (index: number, method: PaymentMethodType) => {
    const updated = [...entries];
    updated[index].method = method;
    onEntriesChange(updated);
  };

  const handleAmountChange = (index: number, amount: number | null) => {
    const updated = [...entries];
    updated[index].amount = Math.max(0, amount ?? 0);
    onEntriesChange(updated);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 10 }}>
          Payment Breakdown
        </Typography.Text>

        <div style={{ display: "grid", gap: 8 }}>
          {entries.map((entry, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <Select
                value={entry.method}
                onChange={(method) => handleMethodChange(index, method)}
                options={PAYMENT_OPTIONS}
                style={{ flex: 1 }}
              />
              <InputNumber
                value={entry.amount}
                onChange={(amount) => handleAmountChange(index, amount)}
                placeholder="Amount"
                prefix="Rs"
                style={{ flex: 1, minWidth: 0 }}
                min={0}
                precision={2}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveEntry(index)}
                disabled={entries.length === 1}
              />
            </div>
          ))}
        </div>

        {entries.length < 3 && (
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={handleAddEntry}
            style={{ marginTop: 10 }}
          >
            Add Payment Method
          </Button>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <Typography.Text type="secondary">Total Required</Typography.Text>
          <Typography.Text>Rs {totalDue.toFixed(2)}</Typography.Text>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <Typography.Text type="secondary">Total Entered</Typography.Text>
          <Typography.Text strong>Rs {totalEntered.toFixed(2)}</Typography.Text>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            borderTop: "1px solid #cbd5e1",
          }}
        >
          <Typography.Text type={remaining > 0 ? "danger" : "success"}>
            {remaining > 0 ? "Remaining" : "Extra"}
          </Typography.Text>
          <Typography.Text
            strong
            type={remaining > 0 ? "danger" : isComplete ? "success" : "secondary"}
          >
            Rs {Math.abs(remaining).toFixed(2)}
          </Typography.Text>
        </div>
      </div>

      {!isComplete && remaining !== totalDue && (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          ⚠ Total must match the invoice amount to proceed
        </Typography.Text>
      )}
    </div>
  );
}
