"use client";

import { useState } from "react";
import { Button, InputNumber, Input, Space, Typography, message, Spin, Select } from "antd";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface PaymentRecord {
  amount: number;
  method: string;
  paidAt: string;
  note?: string | null;
  user?: { name: string | null };
}

interface CollectPaymentSectionProps {
  saleId: string;
  amountDue: number;
  amountPaid: number;
  paymentHistory: PaymentRecord[];
  defaultMethod?: "CASH" | "CARD" | "UPI";
  onPaymentCollected?: (updatedSale: any) => void;
}

type MethodType = "CASH" | "CARD" | "UPI";

type SplitEntry = {
  method: MethodType;
  amount: number;
};

export default function CollectPaymentSection({
  saleId,
  amountDue,
  amountPaid,
  paymentHistory,
  defaultMethod = "CASH",
  onPaymentCollected,
}: CollectPaymentSectionProps) {
  const [collectAmount, setCollectAmount] = useState<number>(amountDue);
  const [paymentMethod, setPaymentMethod] = useState<MethodType>(defaultMethod);
  const [splitMode, setSplitMode] = useState(false);
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([{ method: defaultMethod, amount: amountDue }]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const splitTotal = splitEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const splitRowsValid = splitEntries.length > 0 && splitEntries.every((entry) => entry.amount > 0);
  const splitMatchesCollectAmount = Math.abs(splitTotal - collectAmount) < 0.01;

  const isValidAmount = splitMode
    ? collectAmount > 0 && collectAmount <= amountDue && splitRowsValid && splitMatchesCollectAmount
    : collectAmount > 0 && collectAmount <= amountDue;

  const handleCollectPayment = async () => {
    if (!isValidAmount) {
      setError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/billing/${saleId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: collectAmount,
          method: paymentMethod,
          splitPayments: splitMode ? splitEntries : undefined,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to collect payment");
      }

      const updatedSale = await response.json();
      message.success(`Payment of ₹${Number(collectAmount ?? 0).toFixed(2)} collected successfully`);

      const newAmountDue = updatedSale.amountDue ?? 0;
      
      // Reset form with new amount due
      setCollectAmount(newAmountDue);
      setSplitEntries([{ method: paymentMethod, amount: newAmountDue }]);
      setNote("");
      setError(null);

      // Notify parent component
      if (onPaymentCollected) {
        onPaymentCollected(updatedSale);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to collect payment";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#111827" }}>
        COLLECT PAYMENT
      </Typography.Text>

      {/* Amount Due */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#dc2626",
          marginBottom: 16,
          padding: "8px 0",
        }}
      >
        Outstanding balance: {formatCurrency(amountDue)}
      </div>

      {/* Collect Now Form */}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>
            Collect now
          </Typography.Text>
          <InputNumber
            value={collectAmount}
            onChange={(value) => {
              setCollectAmount(value ?? 0);
              setError(null);
            }}
            min={0}
            max={amountDue}
            step={0.01}
            precision={2}
            style={{ width: "100%", height: 40 }}
            placeholder="Enter amount"
          />
          <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
            Max: {formatCurrency(amountDue)}
          </Typography.Text>
        </div>

        <div>
          <Typography.Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 8 }}>
            Payment method
          </Typography.Text>
          <div style={{ display: "grid", gap: 8 }}>
            <Space.Compact block>
              <Button
                type={!splitMode && paymentMethod === "CASH" ? "primary" : "default"}
                onClick={() => {
                  setSplitMode(false);
                  setPaymentMethod("CASH");
                }}
              >
                Cash
              </Button>
              <Button
                type={!splitMode && paymentMethod === "CARD" ? "primary" : "default"}
                onClick={() => {
                  setSplitMode(false);
                  setPaymentMethod("CARD");
                }}
              >
                Card
              </Button>
              <Button
                type={!splitMode && paymentMethod === "UPI" ? "primary" : "default"}
                onClick={() => {
                  setSplitMode(false);
                  setPaymentMethod("UPI");
                }}
              >
                UPI
              </Button>
              <Button
                type={splitMode ? "primary" : "default"}
                onClick={() => {
                  setSplitMode(true);
                  setSplitEntries([{ method: paymentMethod, amount: collectAmount }]);
                }}
              >
                Split
              </Button>
            </Space.Compact>

            {splitMode ? (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
                {splitEntries.map((entry, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                    <Select
                      value={entry.method}
                      options={[
                        { value: "CASH", label: "Cash" },
                        { value: "CARD", label: "Card" },
                        { value: "UPI", label: "UPI" },
                      ]}
                      onChange={(value) => {
                        setSplitEntries((prev) => prev.map((row, i) => (i === index ? { ...row, method: value as MethodType } : row)));
                      }}
                    />
                    <InputNumber
                      min={0}
                      precision={2}
                      value={entry.amount}
                      onChange={(value) => {
                        setSplitEntries((prev) => prev.map((row, i) => (i === index ? { ...row, amount: Number(value ?? 0) } : row)));
                      }}
                      style={{ width: "100%" }}
                    />
                    <Button
                      danger
                      disabled={splitEntries.length === 1}
                      onClick={() => setSplitEntries((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <Button
                  type="dashed"
                  onClick={() => setSplitEntries((prev) => [...prev, { method: "CASH", amount: 0 }])}
                >
                  Add payment method
                </Button>

                <Typography.Text type={splitMatchesCollectAmount ? "success" : "danger"} style={{ fontSize: 12 }}>
                  Entered: {formatCurrency(splitTotal)} | Expected: {formatCurrency(collectAmount)}
                </Typography.Text>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ height: 36 }}
            maxLength={100}
          />
        </div>

        {error && (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {error}
          </Typography.Text>
        )}

        <Button
          type="primary"
          loading={submitting}
          disabled={!isValidAmount || submitting}
          onClick={handleCollectPayment}
          style={{ width: "100%", height: 40 }}
        >
          {submitting ? (
            <Spin size="small" />
          ) : (
            `Collect ₹${Number(collectAmount ?? 0).toFixed(2)}`
          )}
        </Button>
      </Space>
    </div>
  );
}
