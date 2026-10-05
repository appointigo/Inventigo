"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { AgingBucket } from "./receivableAging";
import type { CustomerReceivableRow, ReceivableRow, ReceivablesResponse } from "./types";
const buckets: AgingBucket[] = ["0–7 days", "8–30 days", "31–60 days", "61–90 days", "90+ days"];
export default function ReceivablesPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const [period, setPeriod] = useState("monthly");
  const [bucket, setBucket] = useState<AgingBucket>();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["receivables", storeId, period, bucket, page],
    enabled: Boolean(storeId),
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({
        storeId: storeId!,
        period,
        compare: "previousPeriod",
        page: String(page),
      });
      if (bucket) p.set("bucket", bucket);
      const r = await fetch(`/api/receivables?${p}`, { signal });
      if (!r.ok)
        throw new Error((await r.json().catch(() => null))?.error ?? "Unable to load receivables");
      return r.json() as Promise<ReceivablesResponse>;
    },
  });
  const invoiceColumns: ColumnsType<ReceivableRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      render: (v, row) => (
        <button
          style={{ border: 0, background: "none", color: "#2563eb", cursor: "pointer" }}
          onClick={() => router.push(`/dashboard/billing?view=history&saleId=${row.id}`)}
        >
          {v}
        </button>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      render: (v, row) => (
        <button
          style={{
            border: 0,
            background: "none",
            color: row.customerId ? "#2563eb" : "inherit",
            cursor: row.customerId ? "pointer" : "default",
          }}
          onClick={() => row.customerId && router.push(`/dashboard/customers/${row.customerId}`)}
        >
          {v}
        </button>
      ),
    },
    {
      title: "Sale date",
      dataIndex: "saleDate",
      render: (v) => new Date(v).toLocaleDateString("en-IN"),
    },
    { title: "Original", dataIndex: "originalAmount", render: formatCurrency },
    { title: "Paid", dataIndex: "paid", render: formatCurrency },
    {
      title: "Outstanding",
      dataIndex: "outstanding",
      render: (v) => <strong>{formatCurrency(v)}</strong>,
    },
    {
      title: "Age since sale",
      dataIndex: "age",
      render: (v, row) => (
        <>
          <strong>{v} days</strong>
          <div>
            <Tag>{row.bucket}</Tag>
          </div>
        </>
      ),
    },
    {
      title: "Last payment",
      dataIndex: "lastPayment",
      render: (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "None"),
    },
  ];
  const customerColumns: ColumnsType<CustomerReceivableRow> = [
    { title: "Customer", dataIndex: "customer" },
    {
      title: "Outstanding",
      dataIndex: "outstanding",
      render: (v) => <strong>{formatCurrency(v)}</strong>,
    },
    { title: "Invoices", dataIndex: "invoiceCount" },
    { title: "Oldest age", dataIndex: "oldestAge", render: (v) => `${v} days` },
    {
      title: "Last payment",
      dataIndex: "lastPayment",
      render: (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "None"),
    },
  ];
  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <Typography.Title level={1} style={{ margin: 0 }}>
            Receivables
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Outstanding balances aged from the sale date, not contractual due dates.
          </Typography.Paragraph>
        </div>
        <Select
          value={period}
          onChange={setPeriod}
          options={[
            { value: "weekly", label: "This week collections" },
            { value: "monthly", label: "This month collections" },
            { value: "quarterly", label: "This quarter collections" },
            { value: "annual", label: "This year collections" },
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
        {[
          { t: "Total outstanding", v: formatCurrency(query.data?.kpis.totalOutstanding ?? 0) },
          { t: "Outstanding invoices", v: query.data?.kpis.invoiceCount ?? 0 },
          { t: "Average age", v: `${query.data?.kpis.averageAge ?? 0} days` },
          { t: "Oldest receivable", v: `${query.data?.kpis.oldestAge ?? 0} days` },
          { t: "Collected in period", v: formatCurrency(query.data?.kpis.collectedInPeriod ?? 0) },
        ].map((x) => (
          <Col xs={24} sm={12} lg={4} key={x.t}>
            <Card>
              <Statistic title={x.t} value={x.v} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card style={{ marginTop: 16 }}>
        <Segmented
          block
          value={bucket ?? "All"}
          options={["All", ...buckets]}
          onChange={(v) => {
            setBucket(v === "All" ? undefined : (v as AgingBucket));
            setPage(1);
          }}
        />
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {query.data?.buckets.map((x) => (
            <Col xs={12} md={4} key={x.bucket}>
              <Statistic title={`${x.bucket} · ${x.count}`} value={formatCurrency(x.amount)} />
            </Col>
          ))}
        </Row>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: "invoices",
              label: "Invoices",
              children: (
                <Table
                  rowKey="id"
                  loading={query.isLoading}
                  dataSource={query.data?.items ?? []}
                  columns={invoiceColumns}
                  scroll={{ x: 1050 }}
                  pagination={{
                    current: page,
                    pageSize: query.data?.pageSize ?? 25,
                    total: query.data?.total ?? 0,
                  }}
                  onChange={(p) => setPage(p.current ?? 1)}
                />
              ),
            },
            {
              key: "customers",
              label: "By customer",
              children: (
                <Table
                  rowKey={(r) => r.customerId ?? "walk-in"}
                  loading={query.isLoading}
                  dataSource={query.data?.customers ?? []}
                  columns={customerColumns}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      </Card>
    </main>
  );
}
