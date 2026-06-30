"use client";

import React, { useEffect, useState } from "react";
import { Row, Col } from "antd";
import { ArrowUpOutlined, SwapOutlined, RollbackOutlined, HourglassOutlined, DollarOutlined } from "@ant-design/icons";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface Props {
  sales: BillingHistoryRow[];
  kpis?: BillingKpis | null;
}

type BillingHistoryRow = {
  rowType?: string;
  type?: string;
  status?: string;
  refundAmount?: number | string | null;
};

type BillingKpis = {
  totalCollected?: number;
  growthPercent?: number;
  exchangeCount?: number;
  exchangesFlaggedForReview?: number;
  refundCount?: number;
  refundGrowthPercent?: number;
  amountReceivable?: number;
  receivableCustomerCount?: number;
  pendingRefundAmount?: number;
  pendingRefundCount?: number;
};

const tileStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#fff",
  padding: 20,
};

export default function StatsStrip({ sales, kpis: propsKpis }: Props) {
  const [fetchedKpis, setFetchedKpis] = useState<BillingKpis | null>(null);
  const kpis = propsKpis ?? fetchedKpis;

  useEffect(() => {
    if (propsKpis) return;

    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/billing/kpis");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setFetchedKpis(data);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [propsKpis]);

  const derivedExchangeCount = sales.filter(
    (sale) => sale.rowType === "RETURN_TRANSACTION" && ["EXCHANGE", "RETURN_EXCHANGE"].includes(String(sale.type))
  ).length;
  const derivedRefundCount = sales.filter(
    (sale) =>
      (sale.rowType === "RETURN_TRANSACTION" && Number(sale.refundAmount ?? 0) > 0) ||
      (sale.rowType === "SALE" && sale.status === "REFUNDED")
  ).length;
  const derivedPendingRefundAmount = sales
    .filter((sale) => sale.rowType === "RETURN_TRANSACTION" && Number(sale.refundAmount ?? 0) > 0)
    .reduce((sum, sale) => sum + Number(sale.refundAmount ?? 0), 0);
  const derivedPendingRefundCount = sales.filter(
    (sale) => sale.rowType === "RETURN_TRANSACTION" && Number(sale.refundAmount ?? 0) > 0
  ).length;

  const displayKpis = {
    totalCollected: kpis?.totalCollected,
    growthPercent: Number(kpis?.growthPercent ?? 0),
    exchangeCount: kpis?.exchangeCount ?? derivedExchangeCount,
    exchangesFlaggedForReview: kpis?.exchangesFlaggedForReview ?? 0,
    refundCount: kpis?.refundCount ?? derivedRefundCount,
    refundGrowthPercent: Number(kpis?.refundGrowthPercent ?? 0),
    amountReceivable: kpis?.amountReceivable,
    receivableCustomerCount: kpis?.receivableCustomerCount ?? 0,
    pendingRefundAmount: kpis?.pendingRefundAmount ?? derivedPendingRefundAmount,
    pendingRefundCount: kpis?.pendingRefundCount ?? derivedPendingRefundCount,
  };
  const totalCollectedLabel =
    typeof displayKpis.totalCollected === "number" ? formatCurrency(displayKpis.totalCollected) : "—";
  const amountReceivableLabel =
    typeof displayKpis.amountReceivable === "number" ? formatCurrency(displayKpis.amountReceivable) : "—";

  return (
    <>
      {/* Row 1: Total Sales, Exchanges, Refunds */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>TOTAL SALES</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{totalCollectedLabel}</div>
                <div style={{ color: displayKpis.growthPercent >= 0 ? "#16a34a" : "#dc2626", marginTop: 6 }}>
                  {displayKpis.growthPercent >= 0 ? "+" : ""}{displayKpis.growthPercent.toFixed(1)}% from last month
                </div>
              </div>
              <div style={{ color: "#10b981" }}><ArrowUpOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>

        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>EXCHANGES</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{displayKpis.exchangeCount}</div>
                <div style={{ color: "#d97706", marginTop: 6 }}>{displayKpis.exchangesFlaggedForReview} flagged for review</div>
              </div>
              <div style={{ color: "#d97706" }}><SwapOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>

        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>REFUNDS</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{displayKpis.refundCount}</div>
                <div style={{ color: displayKpis.refundGrowthPercent >= 0 ? "#16a34a" : "#dc2626", marginTop: 6 }}>
                  {displayKpis.refundGrowthPercent >= 0 ? "+" : ""}{displayKpis.refundGrowthPercent.toFixed(1)}% from last month
                </div>
              </div>
              <div style={{ color: "#ef4444" }}><RollbackOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>

        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>AMOUNT RECEIVABLE</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, color: "#f97316" }}>{amountReceivableLabel}</div>
                <div style={{ color: "#f97316", marginTop: 6 }}>{displayKpis.receivableCustomerCount} customers</div>
              </div>
              <div style={{ color: "#f97316" }}><DollarOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Row 2: Pending Refunds */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>PENDING REFUNDS</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, color: "#dc2626" }}>{formatCurrency(displayKpis.pendingRefundAmount)}</div>
                <div style={{ color: "#dc2626", marginTop: 6 }}>{displayKpis.pendingRefundCount} transactions</div>
              </div>
              <div style={{ color: "#dc2626" }}><HourglassOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
