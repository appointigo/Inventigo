"use client";

import { useRouter } from "next/navigation";
import { Typography, Row, Col, Spin } from "antd";
import KPICards from "@/modules/dashboard/components/KPICards";
import StockByCategoryChart from "@/modules/dashboard/components/StockByCategoryChart";
import TopBrandsChart from "@/modules/dashboard/components/TopBrandsChart";
import RecentMovementsWidget from "@/modules/dashboard/components/RecentMovementsWidget";
import LowStockAlertsList from "@/modules/alerts/components/LowStockAlertsList";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import type { LowStockItem } from "@/modules/alerts/types";

const { Title } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading } = useDashboard();
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts();

  const handleCreatePO = (item: LowStockItem) => {
    router.push(`/dashboard/purchase-orders/new?productId=${encodeURIComponent(item.productId)}`);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* KPI Cards */}
      <div style={{ marginBottom: 24 }}>
        <KPICards kpis={data?.kpis ?? null} loading={loading} />
      </div>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <StockByCategoryChart data={data?.stockByCategory ?? []} loading={loading} />
        </Col>
        <Col xs={24} lg={10}>
          <TopBrandsChart data={data?.topBrands ?? []} loading={loading} />
        </Col>
      </Row>

      {/* Bottom Row: Low Stock + Recent Movements */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <LowStockAlertsList
            items={lowStockItems}
            loading={lowStockLoading}
            onCreatePO={handleCreatePO}
          />
        </Col>
        <Col xs={24} lg={12}>
          <RecentMovementsWidget
            movements={data?.recentMovements ?? []}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
}
