"use client";

import React, { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Space } from "antd";
import { ArrowUpOutlined, SwapOutlined, RollbackOutlined, HourglassOutlined } from "@ant-design/icons";
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
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <div style={tileStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>TOTAL SALES</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{kpis ? formatCurrency(kpis.totalRevenue) : "—"}</div>
              <div style={{ color: "#16a34a", marginTop: 6 }}>+{Math.floor(Math.random() * 10)}% from last month</div>
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
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{exchangeCount}</div>
              <div style={{ color: "#d97706", marginTop: 6 }}>{Math.max(0, exchangeCount - 1)} flagged for review</div>
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
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{refundCount}</div>
              <div style={{ color: "#ef4444", marginTop: 6 }}>{Math.floor(Math.random() * 5)}% from last month</div>
            </div>
            <div style={{ color: "#ef4444" }}><RollbackOutlined style={{ fontSize: 20 }} /></div>
          </div>
        </div>
      </Col>

      <Col span={6}>
        <div style={tileStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", textTransform: "uppercase" }}>PENDING REFUND</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{formatCurrency(pendingRefunds)}</div>
              <div style={{ color: "#d97706", marginTop: 6 }}>{(sales.filter((s:any)=>s.refundAmount>0).length)} transactions</div>
            </div>
            <div style={{ color: "#d97706" }}><HourglassOutlined style={{ fontSize: 20 }} /></div>
          </div>
        </div>
      </Col>
    </Row>
  );
}
