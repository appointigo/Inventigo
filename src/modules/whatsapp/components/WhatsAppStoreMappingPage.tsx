"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
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
  phoneNumberId: string;
  purpose: string;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
};
type Store = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  whatsappSenders: Mapping[];
};
type Phone = {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  status: string;
  waba: { status: string; integration: { status: string } };
};
type Snapshot = { stores: Store[]; phoneNumbers: Phone[] };
type Values = Omit<Mapping, "id"> & { storeId: string };

export default function WhatsAppStoreMappingPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [data, setData] = useState<Snapshot>({ stores: [], phoneNumbers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mapping & { storeId: string }>();
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/whatsapp/store-configuration", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json()) as Snapshot);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(
    () =>
      data.stores.flatMap((store) =>
        store.whatsappSenders.map((mapping) => ({
          ...mapping,
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          phone: data.phoneNumbers.find((phone) => phone.id === mapping.phoneNumberId),
        }))
      ),
    [data]
  );
  const showForm = (row?: (typeof rows)[number]) => {
    setEditing(row);
    form.setFieldsValue(
      row
        ? {
            storeId: row.storeId,
            phoneNumberId: row.phoneNumberId,
            purpose: row.purpose,
            priority: row.priority,
            isDefault: row.isDefault,
            isActive: row.isActive,
          }
        : { purpose: "DEFAULT", priority: 0, isDefault: false, isActive: true }
    );
    setOpen(true);
  };
  const save = async (values: Values) => {
    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/whatsapp/sender-mappings/${editing.id}` : "/api/whatsapp/sender-mappings",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Save failed");
      message.success("Sender mapping saved");
      setOpen(false);
      form.resetFields();
      await load();
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    const response = await fetch(`/api/whatsapp/sender-mappings/${id}`, { method: "DELETE" });
    if (response.ok) {
      message.success("Sender mapping removed");
      await load();
    } else message.error("Mapping could not be removed");
  };
  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: "Store",
      render: (_, row) => (
        <>
          <Text strong>{row.storeName}</Text>
          <br />
          <Tag>{row.storeCode}</Tag>
        </>
      ),
    },
    {
      title: "Phone number",
      render: (_, row) =>
        row.phone ? (
          <>
            <Text>{row.phone.verifiedName || row.phone.displayPhoneNumber}</Text>
            <br />
            <Text type="secondary">{row.phone.displayPhoneNumber}</Text>
          </>
        ) : (
          "Unavailable"
        ),
    },
    { title: "Purpose", dataIndex: "purpose", render: (value) => <Tag color="blue">{value}</Tag> },
    { title: "Priority", dataIndex: "priority" },
    {
      title: "Behavior",
      render: (_, row) => (
        <Space>
          {row.isDefault && <Tag color="green">Default</Tag>}
          <Tag>{row.isActive ? "Active" : "Inactive"}</Tag>
        </Space>
      ),
    },
    {
      title: "Actions",
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} aria-label="Edit mapping" onClick={() => showForm(row)} />
          <Popconfirm title="Remove this mapping?" onConfirm={() => void remove(row.id)}>
            <Button danger icon={<DeleteOutlined />} aria-label="Remove mapping" />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <WhatsAppShell
      activeKey="mapping"
      status={
        <WhatsAppStatusBadge state={data.phoneNumbers.length ? "CONNECTED" : "NOT_CONNECTED"} />
      }
    >
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Map Phone Numbers to Stores
            </Title>
            <Text type="secondary">
              Configure purpose, priority, activity, and the preferred sender.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showForm()}>
            Add mapping
          </Button>
        </Space>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Store mappings could not be loaded"
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            locale={{ emptyText: <Empty description="No Store sender mappings" /> }}
            scroll={{ x: 820 }}
          />
        )}
      </Surface>
      <Modal
        title={editing ? "Edit Store mapping" : "Map phone number to Store"}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="storeId" label="Store" rules={[{ required: true }]}>
            <Select
              options={data.stores.map((store) => ({
                value: store.id,
                label: `${store.name} (${store.code})`,
                disabled: !store.isActive,
              }))}
            />
          </Form.Item>
          <Form.Item name="phoneNumberId" label="Phone number" rules={[{ required: true }]}>
            <Select
              options={data.phoneNumbers.map((phone) => ({
                value: phone.id,
                label: `${phone.verifiedName || phone.displayPhoneNumber} — ${phone.displayPhoneNumber}`,
                disabled:
                  phone.status !== "ACTIVE" ||
                  phone.waba.status !== "ACTIVE" ||
                  phone.waba.integration.status !== "CONNECTED",
              }))}
            />
          </Form.Item>
          <Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}>
            <Select
              options={["DEFAULT", "TRANSACTIONAL", "MARKETING", "SUPPORT"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
            <InputNumber min={0} max={1000} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Preferred sender for this Store and purpose</Checkbox>
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox>Active</Checkbox>
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="Stockiva Store identity"
            description="This controls sender selection inside Stockiva. It does not change Meta's verified sender name."
            style={{ marginBottom: 18 }}
          />
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save mapping
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </WhatsAppShell>
  );
}
