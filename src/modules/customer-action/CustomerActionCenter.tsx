"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Row, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { WhatsAppOutlined } from "@ant-design/icons";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { CustomerActionType } from "./customerSegments";
import type { CustomerActionResponse, CustomerActionRow } from "./types";
const labels: Record<CustomerActionType, string> = {
  DEMAND_FOLLOW_UP: "Demand follow-up",
  OVERDUE_FOLLOW_UP: "Overdue follow-up",
  HIGH_VALUE_DORMANT: "High-value dormant",
  REPEAT_CUSTOMER_DUE: "Repeat customer due",
  VIP: "VIP",
  WELCOME: "Welcome / nurture",
};
export default function CustomerActionCenter() {
  const router = useRouter();
  const { storeId } = useStore();
  const [queue, setQueue] = useState<CustomerActionType>();
  const [period, setPeriod] = useState("monthly");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["customer-actions", storeId, period, queue, page],
    enabled: Boolean(storeId),
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({
        storeId: storeId!,
        period,
        compare: "previousPeriod",
        page: String(page),
      });
      if (queue) p.set("queue", queue);
      const r = await fetch(`/api/customer-actions?${p}`, { signal });
      if (!r.ok)
        throw new Error(
          (await r.json().catch(() => null))?.error ?? "Unable to load customer actions"
        );
      return r.json() as Promise<CustomerActionResponse>;
    },
  });
  const columns: ColumnsType<CustomerActionRow> = [
    {
      title: "Customer",
      dataIndex: "customer",
      render: (v, row) => (
        <button
          style={{
            border: 0,
            background: "none",
            padding: 0,
            color: "#2563eb",
            cursor: "pointer",
            textAlign: "left",
          }}
          onClick={() => router.push(`/dashboard/customers/${row.customerId}`)}
        >
          <strong>{v}</strong>
          <div style={{ color: "#64748b" }}>{row.mobile}</div>
        </button>
      ),
    },
    {
      title: "Why now",
      dataIndex: "action",
      width: 300,
      render: (a) => (
        <div>
          <Tag color={a.severity === "HIGH" ? "red" : a.severity === "MEDIUM" ? "orange" : "blue"}>
            {labels[a.type as CustomerActionType]}
          </Tag>
          <ul style={{ margin: "5px 0 0", paddingLeft: 17 }}>
            {a.reasons.map((r: string) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: "Last purchase",
      dataIndex: "lastPurchaseDate",
      render: (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "Never"),
    },
    { title: "Retained value", dataIndex: "retainedRevenue", render: formatCurrency },
    {
      title: "Preferences",
      render: (_, r) => (
        <span>
          {[r.preferredCategory, r.preferredBrand, r.preferredSize].filter(Boolean).join(" · ") ||
            "—"}
        </span>
      ),
    },
    {
      title: "Open demand / follow-up",
      render: (_, r) => (
        <span>
          {r.unfulfilledDemand} units · {r.openFollowUps} follow-ups
        </span>
      ),
    },
    {
      title: "Action",
      render: (_, r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => router.push(`/dashboard/customers/${r.customerId}`)}>
            Open 360
          </Button>
          {r.marketingConsent ? (
            <Button
              size="small"
              icon={<WhatsAppOutlined />}
              onClick={() => router.push(`/dashboard/whatsapp/contacts?customerId=${r.customerId}`)}
            >
              WhatsApp
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Typography.Title level={1} style={{ margin: 0 }}>
            Customer Action Center
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Who needs attention today, and why.
          </Typography.Paragraph>
        </div>
        <Select
          value={period}
          onChange={setPeriod}
          options={[
            { value: "monthly", label: "This month" },
            { value: "quarterly", label: "This quarter" },
            { value: "annual", label: "This year" },
          ]}
        />
      </div>
      {query.error ? (
        <Alert
          type="error"
          showIcon
          message={query.error instanceof Error ? query.error.message : "Unable to load"}
        />
      ) : null}
      <Row gutter={[12, 12]}>
        {(Object.keys(labels) as CustomerActionType[]).slice(0, 5).map((type) => (
          <Col xs={12} md={8} lg={4} key={type}>
            <Card
              hoverable
              onClick={() => {
                setQueue(type);
                setPage(1);
              }}
              style={{ borderColor: queue === type ? "#2563eb" : undefined }}
            >
              <Typography.Text type="secondary">{labels[type]}</Typography.Text>
              <Typography.Title level={3} style={{ margin: "5px 0 0" }}>
                {query.data?.counts[type] ?? "—"}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>
      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
        <Select
          allowClear
          placeholder="All action queues"
          value={queue}
          style={{ minWidth: 220 }}
          options={(Object.keys(labels) as CustomerActionType[]).map((v) => ({
            value: v,
            label: labels[v],
          }))}
          onChange={(v) => {
            setQueue(v);
            setPage(1);
          }}
        />
        <Typography.Text type="secondary" style={{ alignSelf: "center" }}>
          Repeat-due actions are a transparent cadence heuristic, not an AI prediction.
        </Typography.Text>
      </div>
      <Card>
        <Table
          rowKey="customerId"
          loading={query.isLoading}
          columns={columns}
          dataSource={query.data?.items ?? []}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: query.data?.pageSize ?? 20,
            total: query.data?.total ?? 0,
          }}
          onChange={(p) => setPage(p.current ?? 1)}
        />
      </Card>
    </main>
  );
}
