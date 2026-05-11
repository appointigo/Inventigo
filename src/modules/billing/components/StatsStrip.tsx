"use client";

import React, { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Space } from "antd";
import { ArrowUpOutlined, SwapOutlined, RollbackOutlined, HourglassOutlined, DollarOutlined, UserOutlined } from "@ant-design/icons";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import dayjs from "dayjs";

interface Props {
  sales: any[];
  kpis?: any;
}

const tileStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#fff",
  padding: 20,
};

export default function StatsStrip({ sales, kpis: propsKpis }: Props) {
  const [kpis, setKpis] = useState<any>(propsKpis ?? null);

  useEffect(() => {
    if (propsKpis) {
      setKpis(propsKpis);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/billing/kpis");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setKpis(data);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [propsKpis]);

  // derive exchange/refund counts from the currently-loaded sales array (approximation)
  const exchangeCount = sales.filter((s: any) => s.rowType === "RETURN_TRANSACTION" && s.type === "EXCHANGE").length;
  const refundCount = sales.filter((s: any) => s.rowType === "RETURN_TRANSACTION" && (s.type === "RETURN" || s.type === "RETURN_EXCHANGE")).length;
  const pendingRefunds = sales.filter((s: any) => s.rowType === "RETURN_TRANSACTION" && s.refundAmount > 0).reduce((sum: number, r: any) => sum + Number(r.refundAmount ?? 0), 0);

  return (
    <>
      {/* Row 1: Total Sales, Exchanges, Refunds */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div style={tileStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>TOTAL SALES</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{kpis ? formatCurrency(kpis.totalCollected) : "—"}</div>
                <div style={{ color: kpis?.growthPercent >= 0 ? "#16a34a" : "#dc2626", marginTop: 6 }}>
                  {kpis?.growthPercent >= 0 ? "+" : ""}{kpis?.growthPercent?.toFixed(1) ?? "0"}% from last month
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
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{kpis?.exchangeCount ?? 0}</div>
                <div style={{ color: "#d97706", marginTop: 6 }}>{kpis?.exchangesFlaggedForReview ?? 0} flagged for review</div>
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
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{kpis?.refundCount ?? 0}</div>
                <div style={{ color: kpis?.refundGrowthPercent >= 0 ? "#16a34a" : "#dc2626", marginTop: 6 }}>
                  {kpis?.refundGrowthPercent >= 0 ? "+" : ""}{kpis?.refundGrowthPercent?.toFixed(1) ?? "0"}% from last month
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
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, color: "#f97316" }}>{kpis ? formatCurrency(kpis.amountReceivable) : "—"}</div>
                <div style={{ color: "#f97316", marginTop: 6 }}>{kpis?.receivableCustomerCount ?? 0} customers</div>
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
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, color: "#dc2626" }}>{kpis ? formatCurrency(kpis.pendingRefundAmount) : "—"}</div>
                <div style={{ color: "#dc2626", marginTop: 6 }}>{kpis?.pendingRefundCount ?? 0} transactions</div>
              </div>
              <div style={{ color: "#dc2626" }}><HourglassOutlined style={{ fontSize: 20 }} /></div>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
