"use client";
import { useState } from "react";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Col, DatePicker, Row, Statistic, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useStore } from "@/providers/StoreProvider";
type Breakdown = {
  id: string;
  label: string;
  observedDemand: number;
  fulfilledQuantity: number;
  unfulfilledQuantity: number;
  fulfillmentRate: number | null;
  requestCount: number;
};
type Data = {
  demand: {
    observedDemand: number;
    fulfilledQuantity: number;
    unfulfilledQuantity: number;
    fulfillmentRate: number | null;
  };
  evidence: string;
  evidenceNote: string;
  note: string;
  breakdowns: {
    categories: Breakdown[];
    brands: Breakdown[];
    products: Breakdown[];
    attributes: Array<{
      attribute: string;
      value: string;
      observedDemand: number;
      unfulfilledDemand: number;
    }>;
  };
  trend: Array<{
    label: string;
    observedDemand: number;
    fulfilledQuantity: number;
    unfulfilledQuantity: number;
  }>;
  customersAwaitingRestock: Array<{
    requestId: string;
    customerId: string;
    customer: string;
    mobile: string;
    product: string;
    sku: string;
    unfulfilledQuantity: number;
    currentStock: number;
    requestedAt: string;
  }>;
};
const cols: ColumnsType<Breakdown> = [
  { title: "Requirement", dataIndex: "label" },
  { title: "Requests", dataIndex: "requestCount" },
  { title: "Observed units", dataIndex: "observedDemand" },
  { title: "Fulfilled", dataIndex: "fulfilledQuantity" },
  { title: "Unfulfilled", dataIndex: "unfulfilledQuantity", render: (v) => <strong>{v}</strong> },
  { title: "Fulfilment", dataIndex: "fulfillmentRate", render: (v) => (v == null ? "—" : `${v}%`) },
];
export default function LostOpportunityPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(29, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const query = useQuery({
    queryKey: ["lost-opportunity", storeId, range[0].valueOf(), range[1].valueOf()],
    enabled: Boolean(storeId),
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({
        storeId: storeId!,
        start: range[0].toISOString(),
        end: range[1].toISOString(),
      });
      const r = await fetch(`/api/lost-opportunity?${p}`, { signal });
      if (!r.ok)
        throw new Error(
          (await r.json().catch(() => null))?.error ??
            "Unable to load lost opportunity intelligence"
        );
      return r.json() as Promise<Data>;
    },
  });
  const d = query.data;
  const attrs = (d?.breakdowns.attributes ?? []).map((x, i) => ({
    id: `${x.attribute}:${x.value}:${i}`,
    label: `${x.attribute}: ${x.value}`,
    observedDemand: x.observedDemand,
    fulfilledQuantity: x.observedDemand - x.unfulfilledDemand,
    unfulfilledQuantity: x.unfulfilledDemand,
    fulfillmentRate: x.observedDemand
      ? Math.round(((x.observedDemand - x.unfulfilledDemand) / x.observedDemand) * 1000) / 10
      : null,
    requestCount: 0,
  }));
  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Typography.Title level={1} style={{ margin: 0 }}>
            Lost Opportunity
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            What customers requested that the store could not fulfil.
          </Typography.Paragraph>
        </div>
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => v?.[0] && v[1] && setRange([v[0], v[1]])}
        />
      </div>
      {query.error ? (
        <Alert
          type="error"
          showIcon
          message={query.error instanceof Error ? query.error.message : "Unable to load"}
        />
      ) : null}
      <Alert
        type="info"
        showIcon
        message="Measured in observed units, not estimated revenue"
        description={
          d?.note ??
          "Demand records are not assigned a rupee value without reliable requested-price evidence."
        }
      />
      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        {[
          { t: "Observed demand", v: d?.demand.observedDemand },
          { t: "Fulfilled quantity", v: d?.demand.fulfilledQuantity },
          { t: "Unfulfilled quantity", v: d?.demand.unfulfilledQuantity },
          {
            t: "Demand fulfilment",
            v: d?.demand.fulfillmentRate == null ? "—" : `${d.demand.fulfillmentRate}%`,
          },
        ].map((x) => (
          <Col xs={12} lg={6} key={x.t}>
            <Card>
              <Statistic title={x.t} value={x.v ?? 0} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card style={{ marginTop: 16 }}>
        <Typography.Title level={4}>Recurring unmet demand</Typography.Title>
        <Tabs
          items={[
            {
              key: "category",
              label: "Categories",
              children: (
                <Table
                  rowKey="id"
                  loading={query.isLoading}
                  columns={cols}
                  dataSource={d?.breakdowns.categories ?? []}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "brand",
              label: "Brands",
              children: (
                <Table
                  rowKey="id"
                  columns={cols}
                  dataSource={d?.breakdowns.brands ?? []}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "product",
              label: "Products",
              children: (
                <Table
                  rowKey="id"
                  columns={cols}
                  dataSource={d?.breakdowns.products ?? []}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "attributes",
              label: "Sizes / attributes",
              children: (
                <Table
                  rowKey="id"
                  columns={cols}
                  dataSource={attrs}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>
      <Card style={{ marginTop: 16 }} title="Previously unfulfilled → now in stock">
        <Table
          rowKey="requestId"
          dataSource={d?.customersAwaitingRestock ?? []}
          columns={[
            {
              title: "Customer",
              dataIndex: "customer",
              render: (v, row) => (
                <button
                  style={{ border: 0, background: "none", color: "#2563eb", cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/customers/${row.customerId}`)}
                >
                  {v}
                </button>
              ),
            },
            {
              title: "Requested",
              dataIndex: "product",
              render: (v, row) => (
                <span>
                  {v}
                  <div>
                    <Tag>{row.sku}</Tag>
                  </div>
                </span>
              ),
            },
            { title: "Unfulfilled", dataIndex: "unfulfilledQuantity" },
            {
              title: "Current stock",
              dataIndex: "currentStock",
              render: (v) => <Tag color="green">{v} available</Tag>,
            },
            {
              title: "Requested on",
              dataIndex: "requestedAt",
              render: (v) => new Date(v).toLocaleDateString("en-IN"),
            },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </main>
  );
}
