"use client";

import { useRouter } from "next/navigation";
import { Typography, Row, Col, Spin, Button, Space, Card } from "antd";
import {
  AppstoreAddOutlined,
  TagsOutlined,
  PlusCircleOutlined,
  CheckCircleFilled,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import KPICards from "@/modules/dashboard/components/KPICards";
import StockByCategoryChart from "@/modules/dashboard/components/StockByCategoryChart";
import TopBrandsChart from "@/modules/dashboard/components/TopBrandsChart";
import RecentMovementsWidget from "@/modules/dashboard/components/RecentMovementsWidget";
import LowStockAlertsList from "@/modules/alerts/components/LowStockAlertsList";
import SalesKPIWidget from "@/modules/billing/components/SalesKPIWidget";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import type { LowStockItem } from "@/modules/alerts/types";

const { Title, Text } = Typography;

// ─── Welcome Guide (shown when inventory is empty) ───────────────────────────
function WelcomeGuide({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const firstName = userName?.split(" ")[0] ?? "there";

  const steps = [
    { label: "Create your account",     done: true,  icon: <UserOutlined /> },
    { label: "Register your business",  done: true,  icon: <ShopOutlined /> },
    { label: "Add a product category",  done: false, icon: <TagsOutlined />,       action: () => router.push("/dashboard/categories") },
    { label: "Add a brand",             done: false, icon: <AppstoreAddOutlined />, action: () => router.push("/dashboard/brands") },
    { label: "Add your first product",  done: false, icon: <PlusCircleOutlined />,  action: () => router.push("/dashboard/products") },
  ];

  return (
    <div style={{ padding: "40px 24px", maxWidth: 680, margin: "0 auto" }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Welcome, {firstName}! 👋
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 36 }}>
        Let&apos;s get your inventory set up. Follow these quick steps to get started.
      </Text>

      <Card
        style={{ borderRadius: 16, marginBottom: 28 }}
        bodyStyle={{ padding: "20px 24px" }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: step.done ? 0.55 : 1,
              }}
            >
              <CheckCircleFilled
                style={{
                  fontSize: 20,
                  color: step.done ? "#52c41a" : "#d9d9d9",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: 15 }}>{step.label}</span>
              {!step.done && step.action && (
                <Button size="small" type="primary" onClick={step.action}>
                  Start
                </Button>
              )}
            </div>
          ))}
        </Space>
      </Card>

      <Space wrap>
        <Button
          type="primary"
          size="large"
          icon={<TagsOutlined />}
          onClick={() => router.push("/dashboard/categories")}
        >
          Add Category
        </Button>
        <Button
          size="large"
          icon={<AppstoreAddOutlined />}
          onClick={() => router.push("/dashboard/brands")}
        >
          Add Brand
        </Button>
        <Button
          size="large"
          icon={<PlusCircleOutlined />}
          onClick={() => router.push("/dashboard/products")}
        >
          Add Product
        </Button>
      </Space>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
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

  // Show welcome guide when inventory is empty
  if (!loading && data && data.kpis.totalProducts === 0) {
    return <WelcomeGuide userName={session?.user?.name} />;
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
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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

      {/* Sales Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SalesKPIWidget />
        </Col>
      </Row>
    </div>
  );
}
