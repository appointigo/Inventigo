"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text } = Typography;
type Health = {
  overallStatus: string;
  connection?: { status: string; lastSyncedAt?: string };
  wabas: Array<{ status: string }>;
  phones: Array<{ status: string }>;
  webhook?: { processedAt?: string };
  templates: Array<{ status: string; count: number }>;
  lastSuccessfulSend?: { status: string; submittedAt?: string };
  issues: Array<{ code: string; severity: string; message: string; actionHref: string }>;
};
export default function WhatsAppIntegrationHealthPage() {
  const router = useRouter(),
    [data, setData] = useState<Health>(),
    [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    const r = await fetch("/api/whatsapp/health", { cache: "no-store" });
    if (!r.ok) {
      setError(true);
      return;
    }
    setData(await r.json());
  }, []);
  useEffect(() => {
    void fetch("/api/whatsapp/health", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) setError(true);
      else setData(await response.json());
    });
  }, []);
  return (
    <WhatsAppShell
      activeKey="health"
      status={
        <WhatsAppStatusBadge
          state={data?.overallStatus === "HEALTHY" ? "CONNECTED" : "ACTION_REQUIRED"}
        />
      }
    >
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Integration Health
            </Title>
            <Text type="secondary">
              Operational signals without credentials or raw provider diagnostics.
            </Text>
          </div>
          <Button onClick={() => void load()}>Refresh</Button>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Health could not be loaded"
            style={{ marginTop: 18 }}
          />
        ) : !data ? (
          <Spin style={{ marginTop: 30 }} />
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginTop: 18 }}>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic
                    title="Meta connection"
                    value={data.connection?.status || "NOT CONNECTED"}
                  />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic title="WABAs" value={data.wabas.length} />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic title="Phone numbers" value={data.phones.length} />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic title="Overall" value={data.overallStatus} />
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Card title="Freshness">
                  <p>
                    Webhook:{" "}
                    {data.webhook?.processedAt
                      ? new Date(data.webhook.processedAt).toLocaleString()
                      : "Never observed"}
                  </p>
                  <p>
                    Last sync:{" "}
                    {data.connection?.lastSyncedAt
                      ? new Date(data.connection.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </p>
                  <p>
                    Last successful submit:{" "}
                    {data.lastSuccessfulSend?.submittedAt
                      ? new Date(data.lastSuccessfulSend.submittedAt).toLocaleString()
                      : "None"}
                  </p>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Template health">
                  <Space wrap>
                    {data.templates.map((t) => (
                      <Tag
                        key={t.status}
                        color={
                          ["REJECTED", "DISABLED", "PAUSED"].includes(t.status)
                            ? "error"
                            : "default"
                        }
                      >
                        {t.status}: {t.count}
                      </Tag>
                    ))}
                  </Space>
                  {!data.templates.length && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No templates" />
                  )}
                </Card>
              </Col>
            </Row>
            <Card title="Actionable issues" style={{ marginTop: 16 }}>
              <List
                dataSource={data.issues}
                locale={{
                  emptyText: <Alert type="success" showIcon message="No health issues detected" />,
                }}
                renderItem={(issue) => (
                  <List.Item
                    actions={[
                      <Button key="action" onClick={() => router.push(issue.actionHref)}>
                        Review
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={issue.severity === "error" ? "error" : "warning"}>
                            {issue.severity}
                          </Tag>
                          {issue.code}
                        </Space>
                      }
                      description={issue.message}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Surface>
    </WhatsAppShell>
  );
}
