"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
type Profile = {
  displayName: string;
  signature: string | null;
  supportPhone: string | null;
  defaultLanguage: string;
};
type Store = { id: string; name: string; code: string; whatsappProfile: Profile | null };
type Snapshot = { stores: Store[]; phoneNumbers: unknown[] };

export default function WhatsAppStoreProfilesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Profile>();
  const [stores, setStores] = useState<Store[]>([]);
  const [hasConnectedNumber, setHasConnectedNumber] = useState(false);
  const [storeId, setStoreId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/whatsapp/store-configuration", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const snapshot = (await response.json()) as Snapshot;
      setStores(snapshot.stores);
      setHasConnectedNumber(snapshot.phoneNumbers.length > 0);
      setStoreId((current) => current ?? snapshot.stores[0]?.id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const selected = stores.find((store) => store.id === storeId);
  useEffect(() => {
    if (selected)
      form.setFieldsValue(
        selected.whatsappProfile ?? {
          displayName: selected.name,
          signature: null,
          supportPhone: null,
          defaultLanguage: "en",
        }
      );
  }, [form, selected]);
  const save = async (values: Profile) => {
    if (!storeId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/whatsapp/store-profiles/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as Profile & { error?: string };
      if (!response.ok) throw new Error(body.error || "Save failed");
      setStores((current) =>
        current.map((store) => (store.id === storeId ? { ...store, whatsappProfile: body } : store))
      );
      message.success("Store WhatsApp profile saved");
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };
  return (
    <WhatsAppShell
      activeKey="profiles"
      status={<WhatsAppStatusBadge state={hasConnectedNumber ? "CONNECTED" : "NOT_CONNECTED"} />}
    >
      <Surface>
        <Title level={3}>Store WhatsApp Profile</Title>
        <Paragraph type="secondary">
          Set the Store-facing identity Stockiva adds to messages and workflows. This does not
          change the verified sender name displayed by Meta or WhatsApp.
        </Paragraph>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Store profiles could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : loading ? (
          <Spin />
        ) : stores.length === 0 ? (
          <Empty description="No Stores available" />
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Select
              value={storeId}
              onChange={setStoreId}
              style={{ width: "100%", maxWidth: 420 }}
              options={stores.map((store) => ({
                value: store.id,
                label: `${store.name} (${store.code})`,
              }))}
            />
            <Card title={selected?.name}>
              <Form form={form} layout="vertical" onFinish={save}>
                <Form.Item
                  name="displayName"
                  label="Stockiva display name"
                  rules={[{ required: true }, { max: 120 }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="signature" label="Message signature" rules={[{ max: 500 }]}>
                  <TextArea rows={3} placeholder="Optional closing text" />
                </Form.Item>
                <Form.Item
                  name="supportPhone"
                  label="Support phone"
                  rules={[{ pattern: /^\+?[0-9 ()-]*$/, message: "Enter a valid phone number" }]}
                >
                  <Input placeholder="+91 98765 43210" />
                </Form.Item>
                <Form.Item
                  name="defaultLanguage"
                  label="Default language"
                  rules={[
                    { required: true },
                    { pattern: /^[a-z]{2,3}(?:_[A-Z]{2})?$/, message: "Use en or en_US" },
                  ]}
                >
                  <Input placeholder="en" />
                </Form.Item>
                <Alert
                  type="warning"
                  showIcon
                  message="Meta verified name is unchanged"
                  description="Customers still see the verified sender identity managed and approved in Meta."
                  style={{ marginBottom: 18 }}
                />
                <Button type="primary" htmlType="submit" loading={saving}>
                  Save profile
                </Button>
              </Form>
            </Card>
            <Text type="secondary">
              Saved profiles are loaded from the database whenever this page is reopened.
            </Text>
          </Space>
        )}
      </Surface>
    </WhatsAppShell>
  );
}
