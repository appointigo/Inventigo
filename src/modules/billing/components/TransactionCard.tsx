"use client";

import React, { useState } from "react";
import { Avatar, Card, Typography, Tag, Space, Button } from "antd";
import { DownOutlined, UpOutlined, ShoppingCartOutlined, SwapOutlined, ArrowLeftOutlined, UserOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface Props {
  record: any;
  onViewSale?: (id: string) => Promise<any>;
  onViewReturn?: (rt: any) => void;
  onCollectBalance?: (saleId: string, amount: number, method: any) => Promise<void>;
  onRefund?: (saleId: string) => Promise<void>;
  onOpenReturnExchange?: (saleId: string) => void;
}

const badgeStyle = (type: string) => {
  switch (type) {
    case "PAID": return { background: "#dcfce7", color: "#15803d" };
    case "PARTIAL": return { background: "#fef3c7", color: "#92400e" };
    case "PENDING": return { background: "#fee2e2", color: "#b91c1c" };
    case "REFUNDED": return { background: "#dcfce7", color: "#15803d" };
    default: return { background: "#f3f4f6", color: "#374151" };
  }
};

export default function TransactionCard({ record, onViewSale, onViewReturn, onCollectBalance, onOpenReturnExchange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const isSale = record.rowType === "SALE";

  const avatar = (() => {
    if (isSale) return { bg: "#dbeafe", color: "#2563eb", icon: <ShoppingCartOutlined /> };
    if (record.type === "EXCHANGE") return { bg: "#fef3c7", color: "#d97706", icon: <SwapOutlined /> };
    return { bg: "#fee2e2", color: "#dc2626", icon: <ArrowLeftOutlined /> };
  })();

  const title = isSale ? `#${record.invoiceNumber}` : `#${record.referenceNumber}`;
  const subtitle = `${record.customerName ?? "Walk-in"} • ${dayjs(record.createdAt).format("h:mm A")}`;

  const amountDisplay = (() => {
    if (isSale) return formatCurrency(record.total);
    if (record.netAmount > 0) return `+${formatCurrency(record.netAmount)}`;
    if (record.refundAmount > 0) return `−${formatCurrency(record.refundAmount)}`;
    return formatCurrency(0);
  })();

  const paymentBadge = isSale ? (record.paymentStatus ?? "PAID") : (record.netAmount > 0 ? "COLLECTED" : record.refundAmount > 0 ? "REFUNDED" : "NIL");

  const handlePrimaryAction = async () => {
    if (isSale) {
      await onViewSale?.(record.id);
    } else {
      onViewReturn?.(record);
    }
    setExpanded(true);
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}
      bodyStyle={{ padding: 12 }}
      onClick={() => setExpanded((s) => !s)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <Avatar size={40} style={{ background: avatar.bg, color: avatar.color }}>{avatar.icon}</Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Typography.Text strong ellipsis style={{ maxWidth: 420 }}>{title}</Typography.Text>
            </div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right", minWidth: 120 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{amountDisplay}</div>
          </div>
          <div>
            <Tag style={{ ...badgeStyle(String(paymentBadge)) }}>{String(paymentBadge)}</Tag>
          </div>
          <div>
            <Tag style={{ background: isSale ? "#dbeafe" : record.type === "EXCHANGE" ? "#f3e8ff" : "#fee2e2", color: isSale ? "#1d4ed8" : record.type === "EXCHANGE" ? "#7c3aed" : "#b91c1c" }}>
              {isSale ? "SALE" : record.type === "EXCHANGE" ? "EXCHANGE" : "RETURN"}
            </Tag>
          </div>
          <div>
            <Avatar size={32} icon={<UserOutlined />} />
          </div>
          <div style={{ cursor: "pointer" }}>{expanded ? <UpOutlined /> : <DownOutlined />}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 12, display: "flex", gap: 16 }}>
          {isSale ? (
            <div style={{ display: "flex", gap: 24, width: "100%" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Items</div>
                <div style={{ marginTop: 8 }}>
                  {(record.items ?? []).map((it: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <div style={{ fontSize: 14 }}>{it.product?.name ?? it.productName}</div>
                      <div style={{ color: "#6b7280" }}>{it.quantity} × {formatCurrency(it.unitPrice ?? it.unitPrice)}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, borderTop: "1px dashed #e5e7eb", paddingTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ color: "#6b7280" }}>Payment</div>
                      <div>{record.paymentMethod ?? "CASH"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <div style={{ color: "#6b7280" }}>Amount paid</div>
                      <div>{formatCurrency(record.amountPaid ?? 0)}</div>
                    </div>
                    {record.amountDue > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <div style={{ color: "#6b7280" }}>Amount due</div>
                        <div style={{ color: "#b91c1c" }}>{formatCurrency(record.amountDue)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ width: 320 }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Order details</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ color: "#6b7280" }}>Invoice</div>
                    <div>{record.invoiceNumber}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ color: "#6b7280" }}>Date</div>
                    <div>{dayjs(record.createdAt).format("DD MMM YYYY, h:mm A")}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ color: "#6b7280" }}>Created by</div>
                    <div>{record.createdByName ?? record.createdBy ?? "—"}</div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <Button type="primary" onClick={() => onViewSale?.(record.id)}>View full invoice</Button>
                    {record.status === "COMPLETED" && Date.now() - new Date(record.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000 && (
                      <Button onClick={() => onOpenReturnExchange?.(record.id)}>Return / Exchange</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 24, width: "100%" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>History</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: 8, borderLeft: "2px solid #e5e7eb" }}>
                    <div style={{ fontWeight: 700 }}>Settled & Completed</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{dayjs(record.createdAt).format("DD MMM YYYY, h:mm A")} • Ref {record.referenceNumber}</div>
                  </div>
                </div>
              </div>

              <div style={{ width: 320 }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Notes</div>
                <div style={{ marginTop: 8, fontStyle: record.notes ? "italic" : "normal", color: record.notes ? "#374151" : "#9ca3af" }}>
                  {record.notes ?? "No notes added"}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ color: "#6b7280" }}>Subtotal</div>
                    <div>{formatCurrency(record.offsetAmount ?? 0)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ color: "#6b7280" }}>Difference</div>
                    <div style={{ color: (record.netAmount ?? 0) > 0 ? "#16a34a" : "#dc2626" }}>{(record.netAmount ?? 0) >= 0 ? `+${formatCurrency(record.netAmount ?? 0)}` : `-${formatCurrency(Math.abs(record.netAmount ?? 0))}`}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
