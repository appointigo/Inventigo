"use client";
import { useCallback, useEffect, useState } from "react";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text } = Typography;
type Mapping = {
  id: string;
  purpose: string;
  isDefault: boolean;
  priority: number;
  store: { id: string; name: string; code: string; isActive: boolean };
};
type Phone = {
  id: string;
  metaPhoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  messagingLimitTier: string | null;
  status: string;
  lastSyncedAt: string | null;
  waba: { metaWabaId: string; businessName: string | null };
  storeMappings: Mapping[];
};
const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

export default function WhatsAppPhoneNumbersPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Phone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Phone>();
  const [acting, setActing] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/whatsapp/phone-numbers", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRows((await res.json()) as Phone[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const detail = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/whatsapp/phone-numbers/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setSelected((await res.json()) as Phone);
    } catch {
      message.error("Unable to load phone number");
    } finally {
      setActing(undefined);
    }
  };
  const sync = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/whatsapp/phone-numbers/${id}/sync`, { method: "POST" });
      if (!res.ok) throw new Error();
      message.success("Phone number synced");
      await load();
    } catch {
      message.error("Phone number sync failed");
    } finally {
      setActing(undefined);
    }
  };
  const columns: ColumnsType<Phone> = [
    {
      title: "Phone number",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{r.verifiedName || r.displayPhoneNumber}</Text>
          <Text type="secondary">{r.displayPhoneNumber}</Text>
        </Space>
      ),
    },
    {
      title: "WABA",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Text>{r.waba.businessName || "WhatsApp Business Account"}</Text>
          <Text type="secondary" title={r.waba.metaWabaId}>
            {shortId(r.waba.metaWabaId)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={v === "ACTIVE" ? "green" : "orange"}>{v}</Tag>,
    },
    {
      title: "Quality",
      dataIndex: "qualityRating",
      render: (v) =>
        v ? (
          <Tag
            color={
              v === "GREEN" ? "green" : v === "YELLOW" ? "gold" : v === "RED" ? "red" : "default"
            }
          >
            {v}
          </Tag>
        ) : (
          "—"
        ),
    },
    { title: "Stores", render: (_, r) => r.storeMappings.length },
    {
      title: "Purposes",
      render: (_, r) => (
        <Space wrap>
          {[...new Set(r.storeMappings.map((m) => m.purpose))].map((p) => (
            <Tag key={p}>{p}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space>
          <Button
            aria-label="View details"
            icon={<EyeOutlined />}
            loading={acting === r.id}
            onClick={() => void detail(r.id)}
          />
          <Button aria-label="Sync" icon={<ReloadOutlined />} onClick={() => void sync(r.id)} />
        </Space>
      ),
    },
  ];
  const badge = rows.some((r) => r.status === "ACTIVE") ? "CONNECTED" : "NOT_CONNECTED";
  return (
    <WhatsAppShell activeKey="numbers" status={<WhatsAppStatusBadge state={badge} />}>
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              WhatsApp Phone Numbers
            </Title>
            <Text type="secondary">
              Existing Store assignments are read-only in this milestone.
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Phone numbers could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No WhatsApp phone numbers connected" /> }}
            scroll={{ x: 940 }}
          />
        )}
      </Surface>
      <Drawer
        width={540}
        title="Phone number details"
        open={Boolean(selected)}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: "name", label: "Verified name", children: selected.verifiedName || "—" },
                { key: "phone", label: "Phone number", children: selected.displayPhoneNumber },
                { key: "meta", label: "Meta phone ID", children: selected.metaPhoneNumberId },
                {
                  key: "waba",
                  label: "WABA",
                  children: `${selected.waba.businessName || "WABA"} (${shortId(selected.waba.metaWabaId)})`,
                },
                { key: "status", label: "Meta status", children: selected.status },
                {
                  key: "quality",
                  label: "Quality",
                  children: selected.qualityRating || "Not available",
                },
                {
                  key: "limit",
                  label: "Messaging limit",
                  children: selected.messagingLimitTier || "Not available",
                },
                {
                  key: "sync",
                  label: "Last sync",
                  children: selected.lastSyncedAt
                    ? new Date(selected.lastSyncedAt).toLocaleString()
                    : "Never",
                },
              ]}
            />
            <Title level={5} style={{ marginTop: 24 }}>
              Assigned Stores and purposes
            </Title>
            {selected.storeMappings.length ? (
              selected.storeMappings.map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <Space wrap>
                    <Text strong>{m.store.name}</Text>
                    <Tag>{m.store.code}</Tag>
                    <Tag color="blue">{m.purpose}</Tag>
                    {m.isDefault && <Tag color="green">Default</Tag>}
                    <Text type="secondary">Priority {m.priority}</Text>
                  </Space>
                </div>
              ))
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Not assigned to a Store" />
            )}
          </>
        )}
      </Drawer>
    </WhatsAppShell>
  );
}
