"use client";

import { useRouter } from "next/navigation";
import { Typography, Row, Col, Card, Statistic } from "antd";
import {
  ShoppingOutlined,
  WarningOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import LowStockAlertsList from "@/modules/alerts/components/LowStockAlertsList";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import type { LowStockItem } from "@/modules/alerts/types";

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts();

  const handleCreatePO = (item: LowStockItem) => {
    router.push(`/dashboard/purchase-orders/new?productId=${encodeURIComponent(item.productId)}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Dashboard</Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Welcome to Inventigo — your retail inventory management hub.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={lowStockItems.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: lowStockItems.length > 0 ? "#faad14" : "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Products" value="—" prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Pending POs" value="—" prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <LowStockAlertsList
            items={lowStockItems}
            loading={lowStockLoading}
            onCreatePO={handleCreatePO}
          />
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" size="small">
            <Paragraph type="secondary">
              Full dashboard analytics will be implemented in Phase 6.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
