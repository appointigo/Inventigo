"use client";
import { useCallback, useEffect, useState } from "react";
import { LinkOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
import type { WhatsAppUiState } from "../ui";
const { Title, Text, Paragraph } = Typography;
type Waba = {
  id: string;
  metaWabaId: string;
  businessName: string | null;
  status: string;
  phoneCount: number;
  lastSyncedAt: string | null;
};
type Phone = {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  status: string;
  qualityRating: string | null;
  storeMappings: Array<{ id: string; purpose: string; store: { name: string; code: string } }>;
};
type Profile = {
  id: string;
  displayName: string;
  signature: string | null;
  supportPhone: string | null;
  defaultLanguage: string;
  store: { id: string; name: string; code: string };
};
type Overview = {
  connection: { status: WhatsAppUiState; connectedAt: string | null; lastSyncedAt: string | null };
  wabas: { total: number; active: number; items: Waba[] };
  phoneNumbers: { total: number; active: number; items: Phone[] };
  storeMappings: { total: number; byPurpose: Record<string, number> };
  templates: { total: number; approved: number; byStatus: Record<string, number> };
  storeProfiles: { total: number; items: Profile[] };
  readiness: "NOT_CONNECTED" | "ACTION_REQUIRED" | "SETUP_IN_PROGRESS" | "READY";
  setupProgress: {
    completed: number;
    total: number;
    percent: number;
    steps: Array<{ key: string; label: string; complete: boolean }>;
  };
};
const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

export default function WhatsAppOverviewPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<Overview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/whatsapp/overview", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json()) as Overview);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const sync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/whatsapp/sync", { method: "POST" });
      if (!response.ok) throw new Error();
      await load();
      message.success("WhatsApp data synced");
    } catch {
      message.error("WhatsApp sync failed");
    } finally {
      setSyncing(false);
    }
  };
  const phoneColumns: ColumnsType<Phone> = [
    {
      title: "Phone number",
      render: (_, row) => (
        <>
          <Text strong>{row.verifiedName || row.displayPhoneNumber}</Text>
          <br />
          <Text type="secondary">{row.displayPhoneNumber}</Text>
        </>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={value === "ACTIVE" ? "green" : "orange"}>{value}</Tag>,
    },
    {
      title: "Quality",
      dataIndex: "qualityRating",
      render: (value) => (value ? <Tag>{value}</Tag> : "—"),
    },
    { title: "Stores", render: (_, row) => row.storeMappings.length },
    {
      title: "Purposes",
      render: (_, row) => (
        <Space wrap>
          {[...new Set(row.storeMappings.map((mapping) => mapping.purpose))].map((value) => (
            <Tag key={value}>{value}</Tag>
          ))}
        </Space>
      ),
    },
  ];
  const readinessColor =
    data?.readiness === "READY"
      ? "success"
      : data?.readiness === "ACTION_REQUIRED"
        ? "warning"
        : "processing";
  return (
    <WhatsAppShell
      activeKey="overview"
      status={<WhatsAppStatusBadge state={data?.connection.status ?? "NOT_CONNECTED"} />}
    >
      <Surface>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              WhatsApp Control Center
            </Title>
            <Paragraph type="secondary">
              Organization-wide connection, sender, template, and Store readiness.
            </Paragraph>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              loading={syncing}
              disabled={!data || data.connection.status === "NOT_CONNECTED"}
              onClick={() => void sync()}
            >
              Sync
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/dashboard/whatsapp")}
            >
              Add WhatsApp Account
            </Button>
          </Space>
        </Space>
      </Surface>
      {loading ? (
        <Surface>
          <Spin />
        </Surface>
      ) : error || !data ? (
        <Surface>
          <Alert
            type="error"
            showIcon
            message="WhatsApp overview could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        </Surface>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Connection"
                  value={data.connection.status.replaceAll("_", " ")}
                  prefix={<LinkOutlined />}
                />
                <Text type="secondary">
                  {data.connection.lastSyncedAt
                    ? `Synced ${new Date(data.connection.lastSyncedAt).toLocaleString()}`
                    : "Not synced"}
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Phone Numbers"
                  value={data.phoneNumbers.active}
                  suffix={`/ ${data.phoneNumbers.total} active`}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic
                  title="Templates"
                  value={data.templates.approved}
                  suffix={`/ ${data.templates.total} approved`}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card>
                <Statistic title="Store Mappings" value={data.storeMappings.total} />
              </Card>
            </Col>
          </Row>
          <Surface>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <div>
                <Title level={4}>Messaging Readiness</Title>
                <Tag color={readinessColor}>{data.readiness.replaceAll("_", " ")}</Tag>
              </div>
              <Text strong>
                {data.setupProgress.completed}/{data.setupProgress.total} complete
              </Text>
            </Space>
            <Progress
              percent={data.setupProgress.percent}
              status={data.readiness === "ACTION_REQUIRED" ? "exception" : "active"}
            />
            <List
              grid={{ gutter: 12, xs: 1, sm: 2, lg: 3 }}
              dataSource={data.setupProgress.steps}
              renderItem={(step) => (
                <List.Item>
                  <Tag color={step.complete ? "green" : "default"}>
                    {step.complete ? "Complete" : "Pending"}
                  </Tag>{" "}
                  {step.label}
                </List.Item>
              )}
            />
          </Surface>
          <Surface>
            <Title level={4}>Connected WABAs ({data.wabas.total})</Title>
            <List
              dataSource={data.wabas.items}
              locale={{ emptyText: <Empty description="No connected WABAs" /> }}
              renderItem={(waba) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        {waba.businessName || "WhatsApp Business Account"}
                        <Tag color={waba.status === "ACTIVE" ? "green" : "orange"}>
                          {waba.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Text type="secondary" title={waba.metaWabaId}>
                        {shortId(waba.metaWabaId)} · {waba.phoneCount} phone number(s)
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Surface>
          <Surface>
            <Title level={4}>Phone Numbers</Title>
            <Table
              rowKey="id"
              dataSource={data.phoneNumbers.items}
              columns={phoneColumns}
              pagination={false}
              locale={{ emptyText: <Empty description="No phone numbers" /> }}
              scroll={{ x: 720 }}
            />
          </Surface>
          <Surface>
            <Title level={4}>Store WhatsApp Profiles ({data.storeProfiles.total})</Title>
            <List
              grid={{ gutter: 16, xs: 1, md: 2 }}
              dataSource={data.storeProfiles.items}
              locale={{ emptyText: <Empty description="No Store WhatsApp profiles configured" /> }}
              renderItem={(profile) => (
                <List.Item>
                  <Card size="small" title={`${profile.store.name} (${profile.store.code})`}>
                    <Text strong>{profile.displayName}</Text>
                    <br />
                    <Text type="secondary">
                      Language {profile.defaultLanguage}
                      {profile.supportPhone ? ` · ${profile.supportPhone}` : ""}
                    </Text>
                  </Card>
                </List.Item>
              )}
            />
          </Surface>
        </>
      )}
    </WhatsAppShell>
  );
}
