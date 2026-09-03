"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text } = Typography;
type Execution = {
  id: string;
  status: string;
  skipReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};
type Trigger = "SALE_COMPLETED" | "PAYMENT_DUE" | "CUSTOMER_INACTIVE";
type Row = {
  id: string;
  name: string;
  trigger: Trigger;
  isActive: boolean;
  storeId: string | null;
  templateDefinitionId: string;
  conditions: { daysAfter?: number; minAmount?: number };
  store: { name: string } | null;
  templateDefinition: { name: string; language: string };
  executions: Execution[];
};
type Data = {
  items: Row[];
  stores: Array<{ id: string; name: string; code: string }>;
  templates: Array<{ id: string; name: string; language: string }>;
};
type Values = {
  name: string;
  trigger: Trigger;
  storeId?: string;
  templateDefinitionId: string;
  isActive: boolean;
  daysAfter?: number;
  minAmount?: number;
};
export default function WhatsAppAutomationsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [data, setData] = useState<Data>({ items: [], stores: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [history, setHistory] = useState<Row>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/whatsapp/automations", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      message.error("Automations could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (v: Values, targetId = editing) => {
    const r = await fetch(
      targetId ? `/api/whatsapp/automations/${targetId}` : "/api/whatsapp/automations",
      {
        method: targetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          trigger: v.trigger,
          storeId: v.storeId ?? null,
          templateDefinitionId: v.templateDefinitionId,
          isActive: v.isActive ?? false,
          conditions: { daysAfter: v.daysAfter, minAmount: v.minAmount },
        }),
      }
    );
    const b = await r.json();
    if (!r.ok) message.error(b.error || "Save failed");
    else {
      message.success("Automation saved");
      setOpen(false);
      setEditing(undefined);
      form.resetFields();
      await load();
    }
  };
  const edit = (r: Row) => {
    setEditing(r.id);
    form.setFieldsValue({
      name: r.name,
      trigger: r.trigger,
      storeId: r.storeId ?? undefined,
      templateDefinitionId: r.templateDefinitionId,
      isActive: r.isActive,
      daysAfter: r.conditions.daysAfter,
      minAmount: r.conditions.minAmount,
    });
    setOpen(true);
  };
  const toggle = async (r: Row, checked: boolean) => {
    await save(
      {
        ...r,
        isActive: checked,
        daysAfter: r.conditions.daysAfter,
        minAmount: r.conditions.minAmount,
      } as Values,
      r.id
    );
  };
  const columns: ColumnsType<Row> = [
    {
      title: "Automation",
      render: (_, r) => (
        <>
          <Text strong>{r.name}</Text>
          <br />
          <Text type="secondary">{r.store?.name ?? "All Stores"}</Text>
        </>
      ),
    },
    { title: "Trigger", dataIndex: "trigger", render: (v) => <Tag>{v.replaceAll("_", " ")}</Tag> },
    {
      title: "Template",
      render: (_, r) => `${r.templateDefinition.name} · ${r.templateDefinition.language}`,
    },
    {
      title: "Enabled",
      render: (_, r) => (
        <Switch checked={r.isActive} onChange={(checked) => void toggle(r, checked)} />
      ),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space>
          <Button onClick={() => edit(r)}>Edit</Button>
          <Button onClick={() => setHistory(r)}>History</Button>
        </Space>
      ),
    },
  ];
  return (
    <WhatsAppShell activeKey="automations" status={<WhatsAppStatusBadge state="CONNECTED" />}>
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              WhatsApp Automations
            </Title>
            <Text type="secondary">Event-driven messages through CommunicationService.</Text>
          </div>
          <Button type="primary" onClick={() => setOpen(true)}>
            Create Automation
          </Button>
        </Space>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Supported triggers"
          description="Sale completed, payment due, and customer inactive. Inactive-customer messages require marketing consent."
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data.items}
          columns={columns}
          locale={{ emptyText: <Empty description="No automations" /> }}
        />
      </Surface>
      <Modal
        open={open}
        title={editing ? "Edit Automation" : "Create Automation"}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(undefined);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: false, daysAfter: 30 }}
          onFinish={(v) => void save(v)}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="trigger" label="Trigger" rules={[{ required: true }]}>
            <Select
              options={["SALE_COMPLETED", "PAYMENT_DUE", "CUSTOMER_INACTIVE"].map((v) => ({
                value: v,
                label: v.replaceAll("_", " "),
              }))}
            />
          </Form.Item>
          <Form.Item name="storeId" label="Store">
            <Select
              allowClear
              options={data.stores.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </Form.Item>
          <Form.Item
            name="templateDefinitionId"
            label="Approved template"
            rules={[{ required: true }]}
          >
            <Select
              options={data.templates.map((t) => ({
                value: t.id,
                label: `${t.name} · ${t.language}`,
              }))}
            />
          </Form.Item>
          <Space>
            <Form.Item name="daysAfter" label="Days after / inactive">
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="minAmount" label="Minimum amount">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="isActive" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </Form>
      </Modal>
      <Drawer
        width={620}
        open={Boolean(history)}
        title="Execution history"
        onClose={() => setHistory(undefined)}
      >
        {history?.executions.length ? (
          history.executions.map((x) => (
            <Card key={x.id} size="small" style={{ marginBottom: 10 }}>
              <Space>
                <Tag
                  color={x.status === "FAILED" ? "red" : x.status === "SKIPPED" ? "orange" : "blue"}
                >
                  {x.status}
                </Tag>
                <Text>{new Date(x.createdAt).toLocaleString()}</Text>
              </Space>
              {(x.skipReason || x.errorMessage) && (
                <div>
                  <Text type="danger">{x.skipReason || x.errorCode || x.errorMessage}</Text>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Empty description="No executions" />
        )}
      </Drawer>
    </WhatsAppShell>
  );
}
