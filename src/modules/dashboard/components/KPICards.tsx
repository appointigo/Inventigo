"use client";

import { Row, Col, Card, Statistic, Skeleton } from "antd";
import {
  ShoppingOutlined,
  WalletOutlined,
  WarningOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { DashboardKPIs } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface KPICardsProps {
  kpis: DashboardKPIs | null;
  loading: boolean;
}

export default function KPICards({ kpis, loading }: KPICardsProps) {
  if (loading || !kpis) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card>
              <Skeleton active paragraph={false} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const cards = [
    {
      title: "Total Products",
      value: kpis.totalProducts,
      icon: <ShoppingOutlined />,
      color: "#1677ff",
    },
    {
      title: "Total Stock Value",
      value: kpis.totalStockValue,
      formatter: (val: number) => formatCurrency(val),
      icon: <WalletOutlined />,
      color: "#52c41a",
    },
    {
      title: "Low Stock Items",
      value: kpis.lowStockCount,
      icon: <WarningOutlined />,
      color: kpis.lowStockCount > 0 ? "#faad14" : "#52c41a",
    },
    {
      title: "Pending POs",
      value: kpis.pendingPOsCount,
      icon: <FileTextOutlined />,
      color: kpis.pendingPOsCount > 0 ? "#1677ff" : "#8c8c8c",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={24} sm={12} lg={6} key={card.title}>
          <Card>
            <Statistic
              title={card.title}
              value={card.formatter ? card.formatter(card.value) : card.value}
              prefix={card.icon}
              styles={{ content: { color: card.color } }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
