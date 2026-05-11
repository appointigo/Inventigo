"use client";

import { Divider, Typography, Tag } from "antd";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";

interface PaymentRecord {
  amount: number;
  method: string;
  paidAt: string;
  note?: string | null;
  user?: { name: string | null };
}

interface PaymentHistorySectionProps {
  paymentHistory: PaymentRecord[];
  amountPaid: number;
  amountDue: number;
}

export default function PaymentHistorySection({
  paymentHistory,
  amountPaid,
  amountDue,
}: PaymentHistorySectionProps) {
  if (paymentHistory.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#111827" }}>
        PAYMENT HISTORY
      </Typography.Text>

      <div>
        {paymentHistory.map((payment, idx) => {
          const staffName = payment.user?.name || "System";
          const paidDate = dayjs(payment.paidAt).format("DD MMM YYYY, HH:mm A");

          // Determine tag type
          let tagColor = "default";
          let tagLabel = "";
          if (paymentHistory.length === 1) {
            // Only payment
            tagColor = "green";
            tagLabel = "Full payment";
          } else if (idx === paymentHistory.length - 1) {
            // First payment (oldest)
            tagColor = "default";
            tagLabel = "Initial payment";
          } else if (idx === 0) {
            // Last payment (newest) - check if it cleared the balance
            const totalPaid = paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0);
            if (totalPaid >= amountPaid + amountDue) {
              tagColor = "green";
              tagLabel = "Balance cleared ✓";
            } else {
              tagColor = "blue";
              tagLabel = "Top-up";
            }
          } else {
            // Middle payments
            tagColor = "blue";
            tagLabel = "Top-up";
          }

          return (
            <div
              key={idx}
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 8,
                padding: "8px 0",
                borderBottom: idx !== 0 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  {payment.method} • {formatCurrency(Number(payment.amount))} • {paidDate} • {staffName}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    backgroundColor:
                      tagColor === "green" ? "#dcfce7" : tagColor === "blue" ? "#dbeafe" : "#f3f4f6",
                    color: tagColor === "green" ? "#15803d" : tagColor === "blue" ? "#1e40af" : "#6b7280",
                    borderRadius: 4,
                  }}
                >
                  {tagLabel}
                </span>
              </div>
              {payment.note && (
                <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginLeft: 0 }}>
                  "{payment.note}"
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Divider style={{ margin: "12px 0" }} />
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
        Total collected: <strong>{formatCurrency(amountPaid)}</strong> of{" "}
        <strong>{formatCurrency(amountPaid + amountDue)}</strong>
        {amountDue > 0 && (
          <span style={{ color: "#dc2626" }}> • ₹{formatCurrency(amountDue)} still due</span>
        )}
      </div>
    </div>
  );
}
