"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import WhatsAppShell from "./WhatsAppShell";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import { Surface } from "./WhatsAppSetupPage.styled";
const { Title, Text, Paragraph } = Typography;
type Campaign = {
  id: string;
  name: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  templateDefinition: { name: string; language: string };
  _count: { stores: number; recipients: number };
  metrics: Metrics;
};
type Metrics = {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  skipped: number;
};
type Sender = {
  id: string;
  phoneNumber: {
    displayPhoneNumber: string;
    verifiedName: string | null;
    waba: { businessName: string | null };
  };
};
type Store = { id: string; name: string; code: string; whatsappSenders: Sender[] };
type Template = {
  id: string;
  name: string;
  key: string;
  version: number;
  language: string;
  body: string;
  instances: Array<{ wabaId: string }>;
};
type Options = { stores: Store[]; templates: Template[] };
type Preview = {
  totalMatched: number;
  eligibleCount: number;
  excludedCount: number;
  noConsentCount: number;
  sample: Array<{ id: string; phone: string; name: string | null }>;
};
type Values = {
  name: string;
  templateDefinitionId: string;
  tags?: string[];
  minTotalSpent?: number;
  maxTotalSpent?: number;
  lastVisitAfter?: dayjs.Dayjs;
  lastVisitBefore?: dayjs.Dayjs;
  scheduledAt?: dayjs.Dayjs;
};
export default function WhatsAppCampaignsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [options, setOptions] = useState<Options>({ stores: [], templates: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [storeSenders, setStoreSenders] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, o] = await Promise.all([
        fetch("/api/whatsapp/campaigns", { cache: "no-store" }),
        fetch("/api/whatsapp/campaigns/options", { cache: "no-store" }),
      ]);
      if (!c.ok || !o.ok) throw new Error();
      setRows((await c.json()) as Campaign[]);
      setOptions((await o.json()) as Options);
    } catch {
      message.error("Campaigns could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const stores = useMemo(
    () => Object.entries(storeSenders).map(([storeId, senderId]) => ({ storeId, senderId })),
    [storeSenders]
  );
  const audience = (v: Values) => ({
    tags: v.tags ?? [],
    minTotalSpent: v.minTotalSpent,
    maxTotalSpent: v.maxTotalSpent,
    lastVisitAfter: v.lastVisitAfter?.toISOString(),
    lastVisitBefore: v.lastVisitBefore?.toISOString(),
  });
  const doPreview = async () => {
    try {
      const v = await form.validateFields([
        "tags",
        "minTotalSpent",
        "maxTotalSpent",
        "lastVisitAfter",
        "lastVisitBefore",
      ]);
      if (!stores.length) {
        message.warning("Select at least one Store and marketing sender");
        return;
      }
      const r = await fetch("/api/whatsapp/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stores, audience: audience(v as Values) }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setPreview(body as Preview);
    } catch (e) {
      if (e instanceof Error) message.error(e.message);
    }
  };
  const save = async (v: Values) => {
    if (!stores.length) {
      message.warning("Select at least one marketing sender");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(
        editing ? `/api/whatsapp/campaigns/${editing}` : "/api/whatsapp/campaigns",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: v.name,
            templateDefinitionId: v.templateDefinitionId,
            stores,
            audience: audience(v),
            scheduledAt: v.scheduledAt?.toISOString() ?? null,
          }),
        }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      message.success(editing ? "Campaign updated" : "Campaign created");
      close();
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Campaign save failed");
    } finally {
      setSaving(false);
    }
  };
  const close = () => {
    setOpen(false);
    setEditing(undefined);
    setStoreSenders({});
    setPreview(undefined);
    form.resetFields();
  };
  const edit = async (id: string) => {
    const r = await fetch(`/api/whatsapp/campaigns/${id}`, { cache: "no-store" });
    if (!r.ok) {
      message.error("Campaign could not be loaded");
      return;
    }
    const c = await r.json();
    setEditing(id);
    setStoreSenders(
      Object.fromEntries(
        c.stores.map((x: { storeId: string; senderId: string }) => [x.storeId, x.senderId])
      )
    );
    const a = c.audienceFilters ?? {};
    form.setFieldsValue({
      name: c.name,
      templateDefinitionId: c.templateDefinitionId,
      tags: a.tags ?? [],
      minTotalSpent: a.minTotalSpent,
      maxTotalSpent: a.maxTotalSpent,
      lastVisitAfter: a.lastVisitAfter ? dayjs(a.lastVisitAfter) : undefined,
      lastVisitBefore: a.lastVisitBefore ? dayjs(a.lastVisitBefore) : undefined,
      scheduledAt: c.scheduledAt ? dayjs(c.scheduledAt) : undefined,
    });
    setOpen(true);
  };
  const remove = async (id: string) => {
    const r = await fetch(`/api/whatsapp/campaigns/${id}`, { method: "DELETE" });
    if (r.ok) {
      message.success("Campaign deleted");
      await load();
    } else message.error("Campaign could not be deleted");
  };
  const execute = async (id: string, action: "LAUNCH" | "PAUSE" | "RESUME" | "CANCEL") => {
    const r = await fetch(`/api/whatsapp/campaigns/${id}/execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await r.json();
    if (!r.ok) message.error(body.error || "Campaign action failed");
    else {
      message.success(`Campaign ${action.toLowerCase()} request accepted`);
      await load();
    }
  };
  const columns: ColumnsType<Campaign> = [
    {
      title: "Campaign",
      render: (_, r) => (
        <>
          <Text strong>{r.name}</Text>
          <br />
          <Text type="secondary">
            {r.templateDefinition.name} · {r.templateDefinition.language}
          </Text>
        </>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => (
        <Tag color={v === "SCHEDULED" ? "blue" : v === "CANCELLED" ? "default" : "orange"}>{v}</Tag>
      ),
    },
    { title: "Stores", render: (_, r) => r._count.stores },
    { title: "Audience snapshot", render: (_, r) => r._count.recipients },
    {
      title: "Delivery metrics",
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          <Tag>Queued {r.metrics.queued}</Tag>
          <Tag color="blue">Sent {r.metrics.sent}</Tag>
          <Tag color="cyan">Delivered {r.metrics.delivered}</Tag>
          <Tag color="green">Read {r.metrics.read}</Tag>
          <Tag color="red">Failed {r.metrics.failed}</Tag>
          <Tag>Skipped {r.metrics.skipped}</Tag>
        </Space>
      ),
    },
    {
      title: "Schedule",
      dataIndex: "scheduledAt",
      render: (v) => (v ? new Date(v).toLocaleString() : "Not scheduled"),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space>
          {["DRAFT", "SCHEDULED"].includes(r.status) && (
            <Button type="primary" onClick={() => void execute(r.id, "LAUNCH")}>
              Launch
            </Button>
          )}
          {["QUEUED", "RUNNING"].includes(r.status) && (
            <Button onClick={() => void execute(r.id, "PAUSE")}>Pause</Button>
          )}
          {r.status === "PAUSED" && (
            <Button type="primary" onClick={() => void execute(r.id, "RESUME")}>
              Resume
            </Button>
          )}
          {["DRAFT", "SCHEDULED"].includes(r.status) && (
            <Button onClick={() => void edit(r.id)}>Edit</Button>
          )}
          {["DRAFT", "SCHEDULED"].includes(r.status) ? (
            <Popconfirm title="Delete this campaign draft?" onConfirm={() => void remove(r.id)}>
              <Button danger>Delete</Button>
            </Popconfirm>
          ) : ["QUEUED", "RUNNING", "PAUSED"].includes(r.status) ? (
            <Popconfirm
              title="Cancel this campaign?"
              onConfirm={() => void execute(r.id, "CANCEL")}
            >
              <Button danger>Cancel</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];
  return (
    <WhatsAppShell activeKey="campaigns" status={<WhatsAppStatusBadge state="CONNECTED" />}>
      <Surface>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Marketing Campaigns
            </Title>
            <Text type="secondary">
              Build, schedule, and monitor consent-filtered campaign delivery.
            </Text>
          </div>
          <Button type="primary" onClick={() => setOpen(true)}>
            Create Campaign
          </Button>
        </Space>
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="Safe asynchronous delivery"
          description="Launches are queued in small retryable batches. Pausing or cancelling prevents remaining recipients from sending."
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: <Empty description="No marketing campaigns" /> }}
          scroll={{ x: 1200 }}
        />
      </Surface>
      <Modal
        width={900}
        open={open}
        title={editing ? "Edit Marketing Campaign" : "Create Marketing Campaign"}
        onCancel={close}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={(v) => void save(v)}>
          <Form.Item name="name" label="Campaign name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="templateDefinitionId"
            label="Approved marketing template"
            rules={[{ required: true }]}
          >
            <Select
              options={options.templates.map((t) => ({
                value: t.id,
                label: `${t.name} · v${t.version} · ${t.language}`,
              }))}
            />
          </Form.Item>
          <Title level={5}>Stores and MARKETING senders</Title>
          {options.stores.map((store) => (
            <Card size="small" key={store.id} style={{ marginBottom: 10 }}>
              <Row gutter={12} align="middle">
                <Col span={9}>
                  <Text strong>{store.name}</Text>
                  <br />
                  <Text type="secondary">{store.code}</Text>
                </Col>
                <Col span={15}>
                  <Select
                    allowClear
                    style={{ width: "100%" }}
                    value={storeSenders[store.id]}
                    placeholder={
                      store.whatsappSenders.length
                        ? "Select MARKETING sender"
                        : "No active MARKETING sender"
                    }
                    disabled={!store.whatsappSenders.length}
                    onChange={(value) =>
                      setStoreSenders((current) => {
                        const next = { ...current };
                        if (value) next[store.id] = value;
                        else delete next[store.id];
                        return next;
                      })
                    }
                    options={store.whatsappSenders.map((s) => ({
                      value: s.id,
                      label: `${s.phoneNumber.verifiedName || s.phoneNumber.displayPhoneNumber} · ${s.phoneNumber.waba.businessName || "WABA"}`,
                    }))}
                  />
                </Col>
              </Row>
            </Card>
          ))}
          <Title level={5} style={{ marginTop: 18 }}>
            Audience
          </Title>
          <Paragraph type="secondary">
            Only contacts with explicit MARKETING consent are eligible. Other matches are counted as
            excluded.
          </Paragraph>
          <Form.Item name="tags" label="Customer tags">
            <Select mode="tags" tokenSeparators={[","]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="minTotalSpent" label="Minimum lifetime spend">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxTotalSpent" label="Maximum lifetime spend">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="lastVisitAfter" label="Last visit on or after">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastVisitBefore" label="Last visit on or before">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Button onClick={() => void doPreview()}>Preview Audience</Button>
          {preview && (
            <Row gutter={12} style={{ marginTop: 14 }}>
              <Col span={6}>
                <Statistic title="Matched" value={preview.totalMatched} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Eligible"
                  value={preview.eligibleCount}
                  valueStyle={{ color: "#389e0d" }}
                />
              </Col>
              <Col span={6}>
                <Statistic title="Excluded" value={preview.excludedCount} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="No consent"
                  value={preview.noConsentCount}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Col>
            </Row>
          )}
          <Form.Item
            name="scheduledAt"
            label="Schedule"
            style={{ marginTop: 18 }}
            extra="Scheduled campaigns are picked up by the campaign worker after this time."
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              disabledDate={(date) => date.endOf("day").isBefore(dayjs())}
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!options.templates.length}
              title={
                !options.templates.length ? "An approved MARKETING template is required" : undefined
              }
            >
              {editing ? "Save Changes" : "Create Campaign"}
            </Button>
            <Button onClick={close}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </WhatsAppShell>
  );
}
