"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Select, Space, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./ForecastingPage.module.css";

type ForecastRow = {
  id: string;
  product: string;
  sku: string;
  variant: string;
  horizonDays: number;
  readiness: string;
  evidenceQuality: string;
  method: string | null;
  expected: number | null;
  lower: number | null;
  upper: number | null;
  trend: string;
  modelVersion: string;
  policyVersion: string;
  evidence: Record<string, unknown>;
  evaluation: { samples?: number; mae?: number; wape?: number | null; bias?: number | null } | null;
  outcome: {
    actual: number;
    absoluteError: number;
    bias: number;
    stockoutDistorted: boolean;
  } | null;
};
type ForecastData = {
  generatedAt: string | null;
  snapshotDate?: string;
  summary: {
    variants: number;
    ready: number;
    limited: number;
    notReady: number;
    highStockoutRisk: number;
  };
  items: ForecastRow[];
  performance: {
    samples: number;
    mae: number;
    wape: number | null;
    bias: number | null;
    underForecasts: number;
    overForecasts: number;
    stockoutDistorted: number;
  };
  policy: Record<string, string | number>;
};
type CustomerData = {
  summary: Record<string, number>;
  methodology: string;
  items: Array<{
    customerId: string;
    customer: string;
    mobile: string;
    orderCount: number;
    retainedValue: number;
    lastPurchase: string | null;
    status: string;
    typicalIntervalDays: number | null;
    overdueDays: number | null;
    evidence: string;
    validation: {
      samples: number;
      returnedWithin7Days: number | null;
      returnedWithin30Days: number | null;
      returnedWithin60Days: number | null;
    };
    reasons: string[];
  }>;
};
type SupplierData = {
  summary: Record<string, number>;
  methodology: string;
  items: Array<{
    poId: string;
    supplier: string;
    expectedDate: string | null;
    outstandingUnits: number;
    samples: number;
    status: string;
    typicalLeadDays: number | null;
    variationDays: number | null;
  }>;
};
type OutlookData = {
  totals: {
    highStockoutRisk: number;
    likelyOverstockValue: number;
    deliveryRisk: number;
    overdueCustomers: number;
  };
  stores: Array<{
    store: { id: string; name: string };
    highStockoutRisk: number;
    likelyOverstockValue: number;
    deliveryRisk: number;
    overdueCustomers: number;
  }>;
  limitations: string[];
};

const load = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Unable to load predictive intelligence");
  return data;
};
const label = (value: string) => value.replaceAll("_", " ");
const evidenceColor = (value: string) =>
  value === "HIGH" || value === "READY"
    ? "green"
    : value === "MEDIUM" || value === "LIMITED"
      ? "gold"
      : "default";

export default function ForecastingPage() {
  const { message } = App.useApp();
  const { storeId, storeName } = useStore();
  const { user } = useCurrentUser();
  const [horizon, setHorizon] = useState<7 | 30>(30);
  const [generating, setGenerating] = useState(false);
  const params = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const query = useQuery({
    queryKey: ["forecasting", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const [forecasts, customers, suppliers] = await Promise.all([
        load<ForecastData>(`/api/forecasting${params}`),
        load<CustomerData>(`/api/forecasting/customer-signals${params}`),
        load<SupplierData>(`/api/forecasting/supplier-risk${params}`),
      ]);
      return { forecasts, customers, suppliers };
    },
  });
  const outlook = useQuery({
    queryKey: ["forecast-outlook"],
    enabled: Boolean(user && !user.storeId),
    queryFn: () => load<OutlookData>("/api/forecasting/outlook"),
  });
  const forecasts = query.data?.forecasts;
  const rows = forecasts?.items.filter((row) => row.horizonDays === horizon) ?? [];
  const methodPerformance = useMemo(() => {
    const methods = new Map<
      string,
      { method: string; samples: number; wape: number[]; mae: number[]; selected: number }
    >();
    for (const row of forecasts?.items ?? []) {
      const evaluations = Array.isArray(row.evidence.evaluations)
        ? (row.evidence.evaluations as Array<{
            method: string;
            metrics: { samples: number; wape: number | null; mae: number };
          }>)
        : [];
      for (const item of evaluations) {
        const current = methods.get(item.method) ?? {
          method: item.method,
          samples: 0,
          wape: [],
          mae: [],
          selected: 0,
        };
        current.samples += item.metrics.samples;
        if (item.metrics.wape !== null) current.wape.push(item.metrics.wape);
        current.mae.push(item.metrics.mae);
        if (row.method === item.method) current.selected += 1;
        methods.set(item.method, current);
      }
    }
    return [...methods.values()].map((row) => ({
      ...row,
      averageWape: row.wape.length
        ? Number((row.wape.reduce((a, b) => a + b, 0) / row.wape.length).toFixed(1))
        : null,
      averageMae: row.mae.length
        ? Number((row.mae.reduce((a, b) => a + b, 0) / row.mae.length).toFixed(1))
        : null,
    }));
  }, [forecasts]);
  const generate = async () => {
    if (!storeId) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/forecasting/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed");
      message.success(`${data.snapshots} versioned forecast snapshots generated`);
      await Promise.all([query.refetch(), outlook.refetch()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };
  const forecastColumns: ColumnsType<ForecastRow> = [
    {
      title: "Product",
      render: (_, row) => (
        <div>
          <strong>{row.product}</strong>
          <div>
            {row.sku} · {row.variant}
          </div>
        </div>
      ),
    },
    {
      title: "Readiness",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Tag color={evidenceColor(row.readiness)}>{label(row.readiness)}</Tag>
          <small>{row.evidenceQuality} EVIDENCE</small>
        </Space>
      ),
    },
    {
      title: `${horizon}-day demand`,
      render: (_, row) =>
        row.expected === null ? (
          <div className={styles.explain}>
            <strong>Forecast unavailable</strong>
            <div>
              {(row.evidence.reasons as string[] | undefined)?.[0] ?? "Insufficient evidence"}
            </div>
          </div>
        ) : (
          <div>
            <strong>{row.expected} units</strong>
            <div>
              Range {row.lower}–{row.upper}
            </div>
          </div>
        ),
    },
    {
      title: "Method & validation",
      render: (_, row) =>
        row.method ? (
          <div className={styles.method}>
            <strong>{label(row.method)}</strong>
            <small>
              WAPE {row.evaluation?.wape == null ? "Unavailable" : `${row.evaluation.wape}%`} · MAE{" "}
              {row.evaluation?.mae ?? "—"}
            </small>
            <small>{row.modelVersion}</small>
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "Pattern",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Tag>{label(row.trend)}</Tag>
          <small>{label(String(row.evidence.seasonality ?? "INSUFFICIENT_HISTORY"))}</small>
        </Space>
      ),
    },
    {
      title: "Stockout",
      render: (_, row) => {
        const stockout = row.evidence.stockout as
          | {
              risk?: string;
              shortageUnits?: number;
              shortageWindow?: { earliestDays?: number; latestDays?: number } | null;
            }
          | undefined;
        return stockout ? (
          <div>
            <Tag
              color={
                ["CRITICAL", "HIGH"].includes(stockout.risk ?? "")
                  ? "red"
                  : stockout.risk === "MEDIUM"
                    ? "gold"
                    : "green"
              }
            >
              {stockout.risk}
            </Tag>
            {stockout.shortageUnits ? (
              <div>{stockout.shortageUnits} expected shortage units</div>
            ) : null}
            {stockout.shortageWindow ? (
              <small>
                Likely shortage in {stockout.shortageWindow.earliestDays}–
                {stockout.shortageWindow.latestDays ?? "?"} days
              </small>
            ) : null}
          </div>
        ) : (
          "Unavailable"
        );
      },
    },
  ];
  const customerColumns: ColumnsType<CustomerData["items"][number]> = [
    {
      title: "Customer",
      render: (_, row) => (
        <div>
          <strong>{row.customer}</strong>
          <div>{row.mobile}</div>
        </div>
      ),
    },
    {
      title: "Signal",
      dataIndex: "status",
      render: (value) => (
        <Tag
          color={
            value === "LIKELY_DORMANT"
              ? "red"
              : value === "RETURN_DUE"
                ? "gold"
                : value === "ACTIVE"
                  ? "green"
                  : "default"
          }
        >
          {label(value)}
        </Tag>
      ),
    },
    {
      title: "Cadence",
      render: (_, row) =>
        row.typicalIntervalDays
          ? `${row.typicalIntervalDays} days · ${row.overdueDays ?? 0} overdue`
          : "Insufficient history",
    },
    {
      title: "Evidence",
      render: (_, row) => <div className={styles.explain}>{row.reasons.join(" · ")}</div>,
    },
    {
      title: "Historical validation",
      render: (_, row) =>
        row.validation.samples
          ? `${row.validation.returnedWithin7Days}% / ${row.validation.returnedWithin30Days}% / ${row.validation.returnedWithin60Days}% returned within 7/30/60d (${row.validation.samples} samples)`
          : "Not enough historical signal samples",
    },
    { title: "Value", dataIndex: "retainedValue", render: formatCurrency },
  ];
  const supplierColumns: ColumnsType<SupplierData["items"][number]> = [
    {
      title: "Supplier / PO",
      render: (_, row) => (
        <div>
          <strong>{row.supplier}</strong>
          <div>{row.poId.slice(0, 8).toUpperCase()}</div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => (
        <Tag
          color={
            value === "OVERDUE"
              ? "red"
              : value === "AT_RISK"
                ? "gold"
                : value === "ON_TRACK"
                  ? "green"
                  : "default"
          }
        >
          {label(value)}
        </Tag>
      ),
    },
    { title: "Expected", dataIndex: "expectedDate", render: (value) => value ?? "Missing" },
    { title: "Outstanding", dataIndex: "outstandingUnits", render: (value) => `${value} units` },
    {
      title: "Typical lead",
      render: (_, row) =>
        row.typicalLeadDays === null
          ? "Insufficient history"
          : `${row.typicalLeadDays} days · ±${row.variationDays} observed variation`,
    },
    { title: "Samples", dataIndex: "samples" },
  ];
  if (!storeId)
    return (
      <main className={styles.page}>
        <Alert showIcon type="info" title="Choose a store to load forecasting." />
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Inventory Intelligence · {storeName}</span>
          <h1>Forecasting & Forward Outlook</h1>
          <p>
            Versioned, backtested demand baselines with explicit readiness, uncertainty and
            deterministic fallbacks. Forecasts never execute purchases, transfers, pricing or
            messages.
          </p>
        </div>
        <Space wrap>
          <Select
            value={horizon}
            onChange={setHorizon}
            options={[
              { value: 7, label: "7-day horizon" },
              { value: 30, label: "30-day horizon" },
            ]}
          />
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            Refresh
          </Button>
          <Button type="primary" onClick={generate} loading={generating}>
            Generate daily snapshot
          </Button>
        </Space>
      </header>
      {query.error && <Alert showIcon type="error" message={query.error.message} />}
      {forecasts && (
        <>
          <Alert
            showIcon
            type="info"
            message={
              forecasts.generatedAt
                ? `Latest snapshot ${forecasts.snapshotDate} · IST business-day buckets`
                : "No forecast snapshots yet"
            }
            description="Generate a snapshot to calculate bounded 365-day baselines. NOT_READY variants retain readiness evidence without a precise forecast."
          />
          <section className={styles.metrics}>
            {[
              ["Variants", forecasts.summary.variants],
              ["Ready", forecasts.summary.ready],
              ["Limited", forecasts.summary.limited],
              ["Not ready", forecasts.summary.notReady],
              ["High stockout risk", forecasts.summary.highStockoutRisk],
            ].map(([name, value]) => (
              <article className={styles.metric} key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          <section className={styles.surface}>
            <Tabs
              items={[
                {
                  key: "demand",
                  label: "Demand & Stockout",
                  children: (
                    <Table
                      rowKey="id"
                      dataSource={rows}
                      columns={forecastColumns}
                      scroll={{ x: 1300 }}
                      pagination={{ pageSize: 25 }}
                    />
                  ),
                },
                {
                  key: "performance",
                  label: "Forecast Performance",
                  children: (
                    <>
                      <Alert
                        showIcon
                        type="warning"
                        message="Poor performance remains visible"
                        description={`Evaluated snapshots: ${forecasts.performance.samples}. Overall WAPE ${forecasts.performance.wape ?? "unavailable"}; bias ${forecasts.performance.bias ?? "unavailable"}. Under-forecasts ${forecasts.performance.underForecasts}; over-forecasts ${forecasts.performance.overForecasts}; stockout-distorted ${forecasts.performance.stockoutDistorted}.`}
                        style={{ marginBottom: 12 }}
                      />
                      <Table
                        rowKey="method"
                        dataSource={methodPerformance}
                        pagination={false}
                        columns={[
                          { title: "Method", dataIndex: "method", render: label },
                          { title: "Backtest samples", dataIndex: "samples" },
                          {
                            title: "Average WAPE",
                            dataIndex: "averageWape",
                            render: (v) => (v === null ? "Unavailable" : `${v}%`),
                          },
                          { title: "Average MAE", dataIndex: "averageMae" },
                          { title: "Selected", dataIndex: "selected" },
                        ]}
                      />
                    </>
                  ),
                },
                {
                  key: "customers",
                  label: `Return / Dormancy (${query.data?.customers.summary.returnDue ?? 0})`,
                  children: (
                    <>
                      <Alert
                        showIcon
                        type="info"
                        message="Explainable cadence signal—not churn"
                        description={query.data?.customers.methodology}
                        style={{ marginBottom: 12 }}
                      />
                      <Table
                        rowKey="customerId"
                        dataSource={query.data?.customers.items}
                        columns={customerColumns}
                        scroll={{ x: 1250 }}
                        pagination={{ pageSize: 25 }}
                      />
                    </>
                  ),
                },
                {
                  key: "suppliers",
                  label: `Delivery Risk (${(query.data?.suppliers.summary.atRisk ?? 0) + (query.data?.suppliers.summary.overdue ?? 0)})`,
                  children: (
                    <>
                      <Alert
                        showIcon
                        type="info"
                        message="Delivery evidence, not failure probability"
                        description={query.data?.suppliers.methodology}
                        style={{ marginBottom: 12 }}
                      />
                      <Table
                        rowKey="poId"
                        dataSource={query.data?.suppliers.items}
                        columns={supplierColumns}
                        scroll={{ x: 1000 }}
                      />
                    </>
                  ),
                },
                ...(!user?.storeId && outlook.data
                  ? [
                      {
                        key: "outlook",
                        label: "Owner Forward Outlook",
                        children: (
                          <>
                            <section className={styles.metrics}>
                              {[
                                ["High stockout SKUs", outlook.data.totals.highStockoutRisk],
                                [
                                  "Likely overstock value",
                                  formatCurrency(outlook.data.totals.likelyOverstockValue),
                                ],
                                ["Deliveries at risk", outlook.data.totals.deliveryRisk],
                                ["Customers overdue", outlook.data.totals.overdueCustomers],
                              ].map(([name, value]) => (
                                <article className={styles.metric} key={name}>
                                  <span>{name}</span>
                                  <strong>{value}</strong>
                                </article>
                              ))}
                            </section>
                            <Table
                              rowKey={(row) => row.store.id}
                              dataSource={outlook.data.stores}
                              pagination={false}
                              columns={[
                                { title: "Store", dataIndex: ["store", "name"] },
                                { title: "High stockout", dataIndex: "highStockoutRisk" },
                                {
                                  title: "Likely overstock",
                                  dataIndex: "likelyOverstockValue",
                                  render: formatCurrency,
                                },
                                { title: "Delivery risk", dataIndex: "deliveryRisk" },
                                { title: "Return overdue", dataIndex: "overdueCustomers" },
                              ]}
                            />
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        </>
      )}
    </main>
  );
}
