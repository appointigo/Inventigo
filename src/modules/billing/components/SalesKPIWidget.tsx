"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Statistic, Skeleton } from "antd";
import { DollarOutlined, ShoppingOutlined } from "@ant-design/icons";
import { formatCurrency } from "@/shared/utils/formatCurrency";

type SalesKPIs = {
  todaySales: number;
  todayRevenue: number;
  totalSales: number;
  totalRevenue: number;
};

export default function SalesKPIWidget() {
  const [data, setData] = useState<SalesKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/kpis");
      const d = res.ok ? await res.json() : null;
      setData(d);
    } 
    catch (error) {
      console.error("Failed to fetch sales KPIs:", error);
    } 
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  if (loading || !data) {
    return (
      <Card title="Sales Overview" size="small">
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  return (
    <Card title="Sales Overview" size="small">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic
            title="Today's Sales"
            value={data.todaySales}
            prefix={<ShoppingOutlined />}
            styles={{ content: { color: "#1677ff" } }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Today's Revenue"
            value={formatCurrency(data.todayRevenue)}
            prefix={<DollarOutlined />}
            styles={{ content: { color: "#52c41a" } }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Total Sales"
            value={data.totalSales}
            prefix={<ShoppingOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            prefix={<DollarOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );
}
