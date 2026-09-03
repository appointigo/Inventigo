"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Drawer, Empty, Input, List, Select, Space, Tag, Typography } from "antd";
import WhatsAppShell from "./WhatsAppShell";
import { Surface } from "./WhatsAppSetupPage.styled";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";

const { Title, Text } = Typography;
type Message = {
  id: string;
  direction: string;
  type: string;
  payload?: { content?: { body?: string } };
  createdAt: string;
};
type Conversation = {
  id: string;
  externalPhone: string;
  routingStatus: "RESOLVED" | "UNRESOLVED";
  unresolvedReason?: string;
  lastMessageAt: string;
  store?: { name: string; code: string };
  contact?: { customer?: { name?: string } };
  phoneNumber: { displayPhoneNumber: string; verifiedName?: string };
  messages: Message[];
};

export default function WhatsAppConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>();
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const q = new URLSearchParams({
        ...(filter ? { routingStatus: filter } : {}),
        ...(search ? { search } : {}),
      });
      const response = await fetch(`/api/whatsapp/conversations?${q}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems((await response.json()).items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = async (id: string) => {
    const response = await fetch(`/api/whatsapp/conversations/${id}`, { cache: "no-store" });
    if (response.ok) setSelected(await response.json());
  };

  return (
    <WhatsAppShell activeKey="conversations" status={<WhatsAppStatusBadge state="CONNECTED" />}>
      <Surface>
        <Space wrap style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Conversations
            </Title>
            <Text type="secondary">
              Inbound customer messages and their resolved Store context.
            </Text>
          </div>
          <Space>
            <Input.Search allowClear placeholder="Customer or phone" onSearch={setSearch} />
            <Select
              allowClear
              placeholder="All routing"
              style={{ width: 170 }}
              onChange={setFilter}
              options={[
                { value: "RESOLVED", label: "Resolved" },
                { value: "UNRESOLVED", label: "Unresolved" },
              ]}
            />
          </Space>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Conversations could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : (
          <List
            loading={loading}
            dataSource={items}
            locale={{ emptyText: <Empty description="No inbound conversations" /> }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="view" onClick={() => void open(item.id)}>
                    View
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {item.contact?.customer?.name || item.externalPhone}
                      <Tag color={item.routingStatus === "RESOLVED" ? "success" : "warning"}>
                        {item.routingStatus}
                      </Tag>
                    </Space>
                  }
                  description={
                    <>
                      {item.store
                        ? `${item.store.name} (${item.store.code})`
                        : item.unresolvedReason?.replaceAll("_", " ")}{" "}
                      · received by{" "}
                      {item.phoneNumber.verifiedName || item.phoneNumber.displayPhoneNumber} ·{" "}
                      {new Date(item.lastMessageAt).toLocaleString()}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Surface>
      <Drawer
        width={640}
        title={selected?.contact?.customer?.name || selected?.externalPhone || "Conversation"}
        open={Boolean(selected)}
        onClose={() => setSelected(undefined)}
      >
        {selected?.routingStatus === "UNRESOLVED" && (
          <Alert
            showIcon
            type="warning"
            message="Routing unresolved"
            description="Stockiva could not establish a reliable Store context, so no Store was guessed."
            style={{ marginBottom: 16 }}
          />
        )}
        <List
          dataSource={selected?.messages || []}
          renderItem={(message) => (
            <List.Item
              style={{
                justifyContent: message.direction === "OUTBOUND" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: 12,
                  borderRadius: 12,
                  background: message.direction === "OUTBOUND" ? "#e6f4ff" : "#f5f5f5",
                }}
              >
                <Text>{message.payload?.content?.body || `${message.type} message`}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {message.direction} · {new Date(message.createdAt).toLocaleString()}
                </Text>
              </div>
            </List.Item>
          )}
        />
      </Drawer>
    </WhatsAppShell>
  );
}
