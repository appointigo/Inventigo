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
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
import type { WhatsAppUiState } from "../ui";
import { canSyncWhatsApp } from "../overview";
import { logWhatsAppApiFailure, readWhatsAppApiJson } from "../embeddedSignupClient";
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
      if (!response.ok) {
        const failure = await readWhatsAppApiJson<{
          error?: string;
          code?: string;
          requestId?: string;
          diagnostic?: Record<string, unknown>;
        }>(response);
        logWhatsAppApiFailure("sync_failed", failure);
        throw new Error("Unable to synchronize with Meta.");
      }
      await load();
      message.success("WhatsApp data synced");
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Unable to synchronize with Meta.");
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
  const syncDisabled = !canSyncWhatsApp(data?.connection.status);
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
            <Tooltip
              title={syncDisabled ? "Connect a WhatsApp account before syncing." : undefined}
            >
              <span>
                <Button
                  icon={<ReloadOutlined />}
                  loading={syncing}
                  disabled={syncDisabled}
                  onClick={() => void sync()}
                >
                  Sync
                </Button>
              </span>
            </Tooltip>
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
            <div
              role="list"
              aria-label="Messaging readiness steps"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              {data.setupProgress.steps.map((step) => (
                <div
                  key={step.key}
                  role="listitem"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    padding: "8px 10px",
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                  }}
                >
                  <Tag color={step.complete ? "green" : "default"}>
                    {step.complete ? "Complete" : "Pending"}
                  </Tag>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </Surface>
          <Surface>
            <Title level={4}>Connected WABAs ({data.wabas.total})</Title>
            {data.wabas.items.length ? (
              <div role="list" aria-label="Connected WhatsApp Business Accounts">
                {data.wabas.items.map((waba, index) => (
                  <div
                    key={waba.id}
                    role="listitem"
                    style={{
                      padding: "12px 0",
                      borderBottom:
                        index === data.wabas.items.length - 1 ? undefined : "1px solid #f0f0f0",
                    }}
                  >
                    <Space wrap>
                      <Text strong>{waba.businessName || "WhatsApp Business Account"}</Text>
                      <Tag color={waba.status === "ACTIVE" ? "green" : "orange"}>{waba.status}</Tag>
                    </Space>
                    <div>
                      <Text type="secondary" title={waba.metaWabaId}>
                        {shortId(waba.metaWabaId)} · {waba.phoneCount} phone number(s)
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No connected WABAs" />
            )}
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
            {data.storeProfiles.items.length ? (
              <div
                role="list"
                aria-label="Store WhatsApp profiles"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {data.storeProfiles.items.map((profile) => (
                  <Card
                    key={profile.id}
                    role="listitem"
                    size="small"
                    title={`${profile.store.name} (${profile.store.code})`}
                    style={{ height: "100%" }}
                  >
                    <Text strong>{profile.displayName}</Text>
                    <br />
                    <Text type="secondary">
                      Language {profile.defaultLanguage}
                      {profile.supportPhone ? ` · ${profile.supportPhone}` : ""}
                    </Text>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty description="No Store WhatsApp profiles configured" />
            )}
          </Surface>
        </>
      )}
    </WhatsAppShell>
  );
}
