"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Drawer, Select, Skeleton, Table, Tag, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { ProductIntelligenceResponse, ProductIntelligenceRow } from "./types";
import styles from "./ProductIntelligencePage.module.css";

const statusColors: Record<string, string> = {
  REORDER: "orange",
  DEMAND_GAP: "red",
  DEAD_STOCK: "volcano",
  SLOW_MOVING: "gold",
  OVERSTOCK: "purple",
  MARGIN_LEAKAGE: "magenta",
  HIGH_RETURN: "red",
  HIGH_PERFORMER: "green",
  MONITOR: "default",
};
const periods = [
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "quarterly", label: "This quarter" },
  { value: "annual", label: "This year" },
];

export default function ProductIntelligencePage() {
  const router = useRouter();
  const { storeId } = useStore();
  const [period, setPeriod] = useState("monthly");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [categoryId, setCategoryId] = useState<string>();
  const [brandId, setBrandId] = useState<string>();
  const [productStatus, setProductStatus] = useState<"active" | "inactive">();
  const [status, setStatus] = useState<string>();
  const [sort, setSort] = useState("revenue-desc");
  const [selected, setSelected] = useState<ProductIntelligenceRow | null>(null);
  const query = useQuery({
    queryKey: [
      "product-intelligence",
      storeId,
      period,
      page,
      pageSize,
      categoryId,
      brandId,
      productStatus,
      status,
      sort,
    ],
    enabled: Boolean(storeId),
    queryFn: async ({ signal }) => {
      const [sortField, sortDirection] = sort.split("-");
      const params = new URLSearchParams({
        storeId: storeId!,
        period,
        compare: "previousPeriod",
        page: String(page),
        pageSize: String(pageSize),
        sort: sortField,
        direction: sortDirection,
      });
      if (categoryId) params.set("categoryId", categoryId);
      if (brandId) params.set("brandId", brandId);
      if (productStatus) params.set("productStatus", productStatus);
      if (status) params.set("status", status);
      const response = await fetch(`/api/product-intelligence?${params}`, { signal });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.error ?? "Unable to load product intelligence"
        );
      return response.json() as Promise<ProductIntelligenceResponse>;
    },
  });
  const columns = useMemo<ColumnsType<ProductIntelligenceRow>>(
    () => [
      {
        title: "Product",
        dataIndex: "product",
        fixed: "left",
        width: 210,
        render: (_, row) => (
          <button
            type="button"
            style={{
              border: 0,
              background: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
            onClick={() => setSelected(row)}
          >
            <strong>{row.product}</strong>
            <div className={styles.muted}>
              {row.sku} · {row.brand}
            </div>
          </button>
        ),
      },
      {
        title: "Revenue",
        dataIndex: "revenue",
        width: 125,
        render: (v: number) => formatCurrency(v),
      },
      {
        title: "Gross profit",
        dataIndex: "grossProfit",
        width: 125,
        render: (v: number | null, row) =>
          v == null ? (
            <Tag>Unavailable</Tag>
          ) : (
            <span>
              {formatCurrency(v)}
              <div className={styles.muted}>{row.grossMarginPercent}% margin</div>
            </span>
          ),
      },
      { title: "Units", dataIndex: "unitsSold", width: 80 },
      { title: "Stock", dataIndex: "currentQuantity", width: 80 },
      {
        title: "Cover",
        dataIndex: "stockCoverDays",
        width: 95,
        render: (v: number | null) => (v == null ? "—" : `${v} days`),
      },
      {
        title: "Sell-through",
        dataIndex: "sellThrough",
        width: 110,
        render: (v: number | null) => (v == null ? "—" : `${v}%`),
      },
      { title: "Returns", dataIndex: "returnRate", width: 90, render: (v: number) => `${v}%` },
      {
        title: "Demand gap",
        dataIndex: "unfulfilledDemand",
        width: 105,
        render: (v: number | null) => (v == null ? "Unavailable" : v),
      },
      {
        title: "Status / action",
        dataIndex: "decision",
        width: 240,
        render: (decision: ProductIntelligenceRow["decision"]) => (
          <div>
            <Tag color={statusColors[decision.type]}>{decision.type.replaceAll("_", " ")}</Tag>
            <div className={styles.muted}>{decision.reasons[0]}</div>
          </div>
        ),
      },
    ],
    []
  );
  const onTable = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 25);
  };
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Typography.Title level={1}>Product Intelligence</Typography.Title>
          <p>Decide what to reorder, reduce, promote, or stop buying.</p>
        </div>
        <Select
          allowClear
          placeholder="Product status"
          style={{ minWidth: 150 }}
          value={productStatus}
          options={[
            { value: "active", label: "Active products" },
            { value: "inactive", label: "Inactive products" },
          ]}
          onChange={(value) => {
            setProductStatus(value);
            setPage(1);
          }}
        />
        <Select
          value={period}
          options={periods}
          onChange={(v) => {
            setPeriod(v);
            setPage(1);
          }}
        />
      </header>
      {query.error ? (
        <Alert
          type="error"
          showIcon
          message={query.error instanceof Error ? query.error.message : "Unable to load"}
        />
      ) : null}
      <section className={styles.summary}>
        {[
          { l: "Reorder", v: query.data?.summary.reorder },
          { l: "Demand gaps", v: query.data?.summary.demandGap },
          { l: "Overstock", v: query.data?.summary.overstock },
          { l: "Slow moving", v: query.data?.summary.slowMoving },
          { l: "Dead stock", v: query.data?.summary.deadStock },
          { l: "High returns", v: query.data?.summary.highReturn },
        ].map((x) => (
          <article key={x.l}>
            <span>{x.l}</span>
            <strong>{x.v ?? "—"}</strong>
          </article>
        ))}
      </section>
      <div className={styles.filters}>
        <Select
          allowClear
          placeholder="Category"
          style={{ minWidth: 180 }}
          value={categoryId}
          options={query.data?.filters.categories.map((x) => ({ value: x.id, label: x.name }))}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Brand"
          style={{ minWidth: 160 }}
          value={brandId}
          options={query.data?.filters.brands.map((x) => ({ value: x.id, label: x.name }))}
          onChange={(v) => {
            setBrandId(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Intelligence status"
          style={{ minWidth: 190 }}
          value={status}
          options={[
            "REORDER",
            "DEMAND_GAP",
            "OVERSTOCK",
            "SLOW_MOVING",
            "DEAD_STOCK",
            "HIGH_RETURN",
            "MARGIN_LEAKAGE",
            "HIGH_PERFORMER",
          ].map((x) => ({ value: x, label: x.replaceAll("_", " ") }))}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Select
          value={sort}
          style={{ minWidth: 190 }}
          options={[
            { value: "revenue-desc", label: "Highest revenue" },
            { value: "profit-desc", label: "Highest profit" },
            { value: "margin-asc", label: "Lowest margin" },
            { value: "stockValue-desc", label: "Highest stock value" },
            { value: "cover-asc", label: "Lowest stock cover" },
            { value: "demand-desc", label: "Highest lost demand" },
            { value: "returns-desc", label: "Highest returns" },
          ]}
          onChange={(v) => {
            setSort(v);
            setPage(1);
          }}
        />
      </div>
      <section className={styles.table}>
        {query.isLoading ? (
          <Skeleton active />
        ) : (
          <Table
            rowKey="productId"
            columns={columns}
            dataSource={query.data?.items ?? []}
            scroll={{ x: 1300 }}
            onChange={onTable}
            pagination={{
              current: query.data?.page ?? page,
              pageSize,
              total: query.data?.total ?? 0,
              showSizeChanger: true,
            }}
          />
        )}
      </section>
      <Drawer
        width={620}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.product}
      >
        {selected ? (
          <>
            <Tag color={statusColors[selected.decision.type]}>{selected.decision.title}</Tag>
            <ul className={styles.reasons}>
              {selected.decision.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Typography.Title level={4}>Sales & profit</Typography.Title>
            <div className={styles.detailGrid}>
              <article>
                <span>Net revenue</span>
                <strong>{formatCurrency(selected.revenue)}</strong>
              </article>
              <article>
                <span>Gross profit</span>
                <strong>
                  {selected.grossProfit == null
                    ? "Unavailable"
                    : formatCurrency(selected.grossProfit)}
                </strong>
              </article>
              <article>
                <span>Orders</span>
                <strong>{selected.orders}</strong>
              </article>
              <article>
                <span>Average selling price</span>
                <strong>
                  {selected.averageSellingPrice == null
                    ? "—"
                    : formatCurrency(selected.averageSellingPrice)}
                </strong>
              </article>
            </div>
            <Typography.Title level={4}>Inventory health</Typography.Title>
            <div className={styles.detailGrid}>
              <article>
                <span>Current stock · point in time</span>
                <strong>{selected.currentQuantity}</strong>
              </article>
              <article>
                <span>Inventory value</span>
                <strong>{formatCurrency(selected.inventoryValue)}</strong>
              </article>
              <article>
                <span>Stock cover</span>
                <strong>
                  {selected.stockCoverDays == null ? "—" : `${selected.stockCoverDays} days`}
                </strong>
              </article>
              <article>
                <span>Sell-through</span>
                <strong>{selected.sellThrough == null ? "—" : `${selected.sellThrough}%`}</strong>
              </article>
            </div>
            <Typography.Title level={4}>Demand, returns & discounts</Typography.Title>
            <div className={styles.detailGrid}>
              <article>
                <span>Unfulfilled demand</span>
                <strong>{selected.unfulfilledDemand ?? "Unavailable"}</strong>
              </article>
              <article>
                <span>Return rate</span>
                <strong>{selected.returnRate}%</strong>
              </article>
              <article>
                <span>Discounted value</span>
                <strong>{formatCurrency(selected.discountAmount)}</strong>
              </article>
              <article>
                <span>Discount dependency</span>
                <strong>{selected.discountRate}%</strong>
              </article>
            </div>
            <Button
              style={{ marginTop: 18 }}
              onClick={() => router.push(`/dashboard/products/${selected.productId}`)}
            >
              Open product record
            </Button>
          </>
        ) : null}
      </Drawer>
    </main>
  );
}
