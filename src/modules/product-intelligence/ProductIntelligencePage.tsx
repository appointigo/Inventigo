"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Drawer, Select, Skeleton, Table, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import InventoryKpiGrid from "@/modules/inventory/components/InventoryKpiGrid";
import { useStore } from "@/providers/StoreProvider";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
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
  INBOUND_STOCK: "blue",
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
  const { user } = useCurrentUser();
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
  const transferQuery = useQuery({
    queryKey: [
      "product-transfer-opportunities",
      storeId,
      query.data?.range.start,
      query.data?.range.end,
    ],
    enabled: Boolean(storeId && query.data && user && !user.storeId),
    queryFn: async () => {
      const params = new URLSearchParams({
        from: new Date(query.data!.range.start).toISOString().slice(0, 10),
        to: new Date(new Date(query.data!.range.end).getTime() - 1).toISOString().slice(0, 10),
      });
      const response = await fetch(`/api/transfer-recommendations?${params}`);
      if (!response.ok) return { items: [] };
      return response.json() as Promise<{
        items: Array<{
          productId: string;
          destinationStoreId: string;
          sourceStoreName: string | null;
          recommendedQuantity: number;
          remainingSupplierRequirement: number;
        }>;
      }>;
    },
  });
  const transferFor = useCallback(
    (productId: string) =>
      transferQuery.data?.items.find(
        (item) =>
          item.productId === productId &&
          item.destinationStoreId === storeId &&
          item.recommendedQuantity > 0
      ),
    [storeId, transferQuery.data]
  );
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
        title: "Inbound",
        dataIndex: "inboundQuantity",
        width: 95,
        render: (v: number, row) =>
          v ? (
            <span>
              {v}
              <div className={styles.muted}>
                {row.inboundExpectedDate ?? (row.inboundOverdue ? "Overdue" : "Date missing")}
              </div>
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: "Recommended",
        dataIndex: "replenishment",
        width: 145,
        render: (value: ProductIntelligenceRow["replenishment"], row) => {
          const transfer = transferFor(row.productId);
          return transfer ? (
            <span>
              {transfer.recommendedQuantity} transfer
              <div className={styles.muted}>from {transfer.sourceStoreName}</div>
            </span>
          ) : value ? (
            <span>
              {value.recommendedQuantity == null ? "—" : `${value.recommendedQuantity} units`}
              <div className={styles.muted}>{value.evidenceQuality} evidence</div>
            </span>
          ) : (
            "Not evaluated"
          );
        },
      },
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
    [transferFor]
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
      <InventoryKpiGrid
        label="Product intelligence summary"
        items={[
          {
            label: "Reorder",
            value: query.data?.summary.reorder ?? "—",
            icon: <ShoppingCartOutlined />,
            tone: "blue",
          },
          {
            label: "Demand gaps",
            value: query.data?.summary.demandGap ?? "—",
            icon: <BarChartOutlined />,
            tone: "orange",
          },
          {
            label: "Overstock",
            value: query.data?.summary.overstock ?? "—",
            icon: <AppstoreOutlined />,
            tone: "red",
          },
          {
            label: "Slow moving",
            value: query.data?.summary.slowMoving ?? "—",
            icon: <ClockCircleOutlined />,
            tone: "purple",
          },
          {
            label: "Dead stock",
            value: query.data?.summary.deadStock ?? "—",
            icon: <WarningOutlined />,
            tone: "red",
          },
          {
            label: "High returns",
            value: query.data?.summary.highReturn ?? "—",
            icon: <SyncOutlined />,
            tone: "green",
          },
          {
            label: "Inbound stock",
            value: query.data?.summary.inboundStock ?? "—",
            icon: <InboxOutlined />,
            tone: "blue",
          },
        ]}
      />
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
            "INBOUND_STOCK",
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
        size={620}
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
            <Typography.Title level={4}>Replenishment recommendation</Typography.Title>
            {transferFor(selected.productId) ? (
              <Alert
                showIcon
                type="success"
                message={`${transferFor(selected.productId)!.recommendedQuantity} units can be transferred from ${transferFor(selected.productId)!.sourceStoreName}`}
                description={`${transferFor(selected.productId)!.remainingSupplierRequirement} units remain for supplier replenishment.`}
              />
            ) : null}
            {selected.replenishment ? (
              <>
                <Tag color={statusColors[selected.replenishment.type] ?? "blue"}>
                  {selected.replenishment.type.replaceAll("_", " ")}
                </Tag>
                <p>
                  {selected.replenishment.recommendedQuantity == null
                    ? "No precise reorder quantity is available."
                    : `${selected.replenishment.recommendedQuantity} units recommended across variants.`}
                </p>
                <Tag>{selected.replenishment.evidenceQuality} evidence</Tag>
                <ul className={styles.reasons}>
                  {selected.replenishment.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Open Inventory Actions to evaluate this product for the selected period.</p>
            )}
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
