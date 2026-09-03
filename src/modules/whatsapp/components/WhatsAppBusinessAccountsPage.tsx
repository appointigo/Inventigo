"use client";
import { useCallback, useEffect, useState } from "react";
import { DisconnectOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
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
type Phone = {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  status: string;
};
type Account = {
  id: string;
  metaWabaId: string;
  businessName: string | null;
  status: string;
  currency: string | null;
  timezone: string | null;
  lastSyncedAt: string | null;
  _count: { phoneNumbers: number };
  phoneNumbers?: Phone[];
};
const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

export default function WhatsAppBusinessAccountsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Account>();
  const [acting, setActing] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/whatsapp/business-accounts", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRows((await res.json()) as Account[]);
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
      const res = await fetch(`/api/whatsapp/business-accounts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setSelected((await res.json()) as Account);
    } catch {
      message.error("Unable to load business account");
    } finally {
      setActing(undefined);
    }
  };
  const action = async (id: string, kind: "sync" | "disconnect") => {
    setActing(id);
    try {
      const res = await fetch(
        `/api/whatsapp/business-accounts/${id}${kind === "sync" ? "/sync" : ""}`,
        { method: kind === "sync" ? "POST" : "DELETE" }
      );
      if (!res.ok) throw new Error();
      message.success(
        kind === "sync" ? "Business account synced" : "Business account disconnected"
      );
      setSelected(undefined);
      await load();
    } catch {
      message.error(`Business account ${kind} failed`);
    } finally {
      setActing(undefined);
    }
  };
  const columns: ColumnsType<Account> = [
    {
      title: "Business account",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{r.businessName || "WhatsApp Business Account"}</Text>
          <Text type="secondary" title={r.metaWabaId}>
            {shortId(r.metaWabaId)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <Tag color={v === "ACTIVE" ? "green" : "orange"}>{v}</Tag>,
    },
    { title: "Phones", render: (_, r) => r._count.phoneNumbers },
    {
      title: "Last sync",
      dataIndex: "lastSyncedAt",
      render: (v) => (v ? new Date(v).toLocaleString() : "Never"),
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
          <Button
            aria-label="Sync"
            icon={<ReloadOutlined />}
            onClick={() => void action(r.id, "sync")}
          />
          <Popconfirm
            title="Disconnect from Stockiva?"
            description="Meta assets stay intact; Store sender mappings are disabled."
            onConfirm={() => void action(r.id, "disconnect")}
          >
            <Button danger aria-label="Disconnect" icon={<DisconnectOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const badge = rows.some((r) => r.status === "ACTIVE") ? "CONNECTED" : "NOT_CONNECTED";
  return (
    <WhatsAppShell activeKey="accounts" status={<WhatsAppStatusBadge state={badge} />}>
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              WhatsApp Business Accounts
            </Title>
            <Text type="secondary">Accounts granted to this organization through Meta.</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Business accounts could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            pagination={false}
            locale={{ emptyText: <Empty description="No WhatsApp Business Accounts connected" /> }}
            scroll={{ x: 760 }}
          />
        )}
      </Surface>
      <Drawer
        width={520}
        title="Business account details"
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
                { key: "name", label: "Name", children: selected.businessName || "—" },
                { key: "id", label: "WABA ID", children: selected.metaWabaId },
                { key: "status", label: "Status", children: selected.status },
                { key: "currency", label: "Currency", children: selected.currency || "—" },
                { key: "timezone", label: "Timezone", children: selected.timezone || "—" },
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
              Phone numbers
            </Title>
            {selected.phoneNumbers?.length ? (
              selected.phoneNumbers.map((p) => (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <Space>
                    <Text strong>{p.verifiedName || p.displayPhoneNumber}</Text>
                    <Tag>{p.status}</Tag>
                  </Space>
                  <br />
                  <Text type="secondary">{p.displayPhoneNumber}</Text>
                </div>
              ))
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No phone numbers" />
            )}
          </>
        )}
      </Drawer>
    </WhatsAppShell>
  );
}
