"use client";

import React, { useState } from "react";
import { Button, Tag, Avatar, Divider } from "antd";
import { FileTextOutlined, DownOutlined, UpOutlined, ShoppingCartOutlined, SwapOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatBusinessDate } from "@/modules/billing/utils/formatBusinessDate";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import CollectPaymentSection from "./CollectPaymentSection";
import PaymentHistorySection from "./PaymentHistorySection";

interface Props {
  sales: any[];
  loading?: boolean;
  onViewSale: (id: string) => Promise<any>;
  onViewReturn: (rt: any) => void;
  onCollectBalance: (saleId: string, amount: number, method: any) => Promise<void>;
  onOpenReturnExchange?: (saleId: string) => void;
}

const badgeStyle = (type: string) => {
  switch (type) {
    case "PAID": return { background: "#dcfce7", color: "#15803d" };
    case "PARTIAL": return { background: "#fef3c7", color: "#92400e" };
    case "PENDING": return { background: "#fee2e2", color: "#b91c1c" };
    default: return { background: "#f3f4f6", color: "#374151" };
  }
};

  const GRID_TEMPLATE = "minmax(260px, 3fr) 140px 100px 120px minmax(200px, 1fr) 120px minmax(180px, 220px)";

export default function OrdersTable({ sales, loading = false, onViewSale, onViewReturn, onCollectBalance, onOpenReturnExchange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1120 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, padding: "12px 16px", borderBottom: "1px solid #eef2f7", fontSize: 13, color: "#6b7280", fontWeight: 600, alignItems: "center" }}>
            <div>ORDER / CUSTOMER</div>
            <div>DATE</div>
            <div>TYPE</div>
            <div>PAYMENT</div>
            <div>AMOUNT</div>
            <div>STATUS</div>
            <div style={{ textAlign: "right" }}>ACTIONS</div>
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, padding: "12px 16px", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: "#eef2f6" }} />
                  <div style={{ width: 180, height: 12, background: "#eef2f6", borderRadius: 4 }} />
                </div>

                <div>
                  <div style={{ width: 100, height: 12, background: "#eef2f6", borderRadius: 4 }} />
                  <div style={{ width: 60, height: 10, background: "#f6f7f9", borderRadius: 4, marginTop: 6 }} />
                </div>

                <div style={{ width: 60, height: 20, background: "#eef2f6", borderRadius: 8 }} />

                <div style={{ width: 80, height: 12, background: "#eef2f6", borderRadius: 4 }} />

                <div style={{ textAlign: "right" }}>
                  <div style={{ width: 100, height: 14, background: "#eef2f6", borderRadius: 4, marginLeft: "auto" }} />
                  <div style={{ width: 80, height: 10, background: "#f6f7f9", borderRadius: 4, marginTop: 6, marginLeft: "auto" }} />
                </div>

                <div style={{ width: 80, height: 20, background: "#eef2f6", borderRadius: 8 }} />

                <div style={{ textAlign: "right" }}>
                  <div style={{ width: 140, height: 32, marginLeft: "auto", display: "inline-block", background: "#fff" }} />
                </div>
              </div>
            ))
          ) : sales.map((rec: any) => {
            const businessDate = rec.businessDate ?? rec.transactionDate ?? rec.createdAt;
            const { date, time } = formatBusinessDate(businessDate);
            const isSale = rec.rowType === "SALE" || rec.rowType === undefined;
            const avatar = isSale ? { bg: "#dbeafe", icon: <ShoppingCartOutlined />, color: "#2563eb" } : rec.type === "EXCHANGE" ? { bg: "#fef3c7", icon: <SwapOutlined />, color: "#d97706" } : { bg: "#fee2e2", icon: <ArrowLeftOutlined />, color: "#dc2626" };

            return (
              <div key={rec.id}>
                <div style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, padding: "12px 16px", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                    <Avatar size={40} style={{ background: avatar.bg, color: avatar.color }}>{avatar.icon}</Avatar>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>#{rec.invoiceNumber ?? rec.referenceNumber}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>{rec.customerName ?? "Walk-in"}</div>
                      {rec.customerPhone ? <div style={{ color: "#9ca3af", fontSize: 12 }}>{rec.customerPhone}</div> : null}
                    </div>
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600 }}>{formatBusinessDate(businessDate).date}</div>
                    {formatBusinessDate(businessDate).time ? <div style={{ color: "#6b7280", fontSize: 12 }}>{formatBusinessDate(businessDate).time}</div> : null}
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <Tag style={{ borderRadius: 8, padding: "4px 8px", background: isSale ? "#dbeafe" : "#f3e8ff", color: isSale ? "#1d4ed8" : "#7c3aed" }}>{isSale ? "SALE" : rec.type === "EXCHANGE" ? "EXCHANGE" : "RETURN"}</Tag>
                  </div>

                  <div style={{ color: "#6b7280", fontSize: 13, textAlign: "left" }}>{rec.paymentMethod ?? "CASH"}</div>

                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(rec.total ?? rec.netAmount ?? 0)}</div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Paid: {formatCurrency(rec.amountPaid ?? 0)}</div>
                    {Number(rec.amountDue ?? 0) > 0 && <div style={{ color: "#b91c1c", fontSize: 12 }}>Due: {formatCurrency(rec.amountDue)}</div>}
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <Tag style={{ ...badgeStyle(String(rec.paymentStatus ?? rec.status ?? "PENDING")), padding: "4px 10px", borderRadius: 8 }}>{String(rec.paymentStatus ?? rec.status ?? "PENDING")}</Tag>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {Number(rec.amountDue ?? 0) > 0 && <Button onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)} size="small">Collect</Button>}
                      <Button onClick={() => onViewSale(rec.id)} icon={<FileTextOutlined />} size="small">View</Button>
                      <Button onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)} size="small">{expandedId === rec.id ? <UpOutlined /> : <DownOutlined />}</Button>
                    </div>
                  </div>
                </div>

                {expandedId === rec.id && (
                  <div style={{ padding: 16, borderTop: "1px solid #eef2f7", background: "#fbfdff" }}>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Items</div>
                        <div style={{ marginTop: 8 }}>
                          {(rec.items ?? []).map((it: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                              <div style={{ fontSize: 14 }}>{it.product?.name ?? it.productName}</div>
                              <div style={{ color: "#6b7280" }}>{it.quantity} × {formatCurrency(it.unitPrice ?? it.unitPrice)}</div>
                            </div>
                          ))}

                          <div style={{ marginTop: 12, borderTop: "1px dashed #e5e7eb", paddingTop: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <div style={{ color: "#6b7280" }}>Payment</div>
                              <div>{rec.paymentMethod ?? "CASH"}</div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                              <div style={{ color: "#6b7280" }}>Amount paid</div>
                              <div>{formatCurrency(rec.amountPaid ?? 0)}</div>
                            </div>
                            {rec.amountDue > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                                <div style={{ color: "#6b7280" }}>Amount due</div>
                                <div style={{ color: "#b91c1c" }}>{formatCurrency(rec.amountDue)}</div>
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
                            <div>{rec.invoiceNumber}</div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                            <div style={{ color: "#6b7280" }}>Date</div>
                            <div>{date}{time ? `, ${time}` : ''}</div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                            <div style={{ color: "#6b7280" }}>Created by</div>
                            <div>{rec.userName ?? "—"}</div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <PaymentHistorySection paymentHistory={rec.payments ?? []} amountPaid={rec.amountPaid ?? 0} amountDue={rec.amountDue ?? 0} />
                          </div>

                          {Number(rec.amountDue ?? 0) > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <CollectPaymentSection
                                saleId={rec.id}
                                amountDue={rec.amountDue ?? 0}
                                amountPaid={rec.amountPaid ?? 0}
                                paymentHistory={rec.payments ?? []}
                                defaultMethod={rec.paymentMethod ?? "CASH"}
                                onCollectPayment={onCollectBalance}
                                onPaymentCollected={() => { /* no-op: parent should refresh */ }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ padding: 12, textAlign: "right", color: "#6b7280", fontSize: 12 }}>
            Showing {sales.length} orders
          </div>
        </div>
      </div>
    </div>
  );
}
