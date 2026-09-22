"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Flex,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BulbOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WarningFilled,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useInventoryDrilldown, useInventoryIntelligence } from "../hooks/useInventoryIntelligence";
import type {
  CategoryPerformanceRow,
  ChangeMetric,
  InventoryComparisonMode,
  InventoryDrilldownRow,
  InventoryPeriodPreset,
  ProductSignalRow,
} from "../types";
import styles from "./InventoryIntelligencePanel.module.css";

const money = (value: number | null) =>
  value === null || !Number.isFinite(value)
    ? "Unavailable"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
const number = (value: number | null, suffix = "") =>
  value === null || !Number.isFinite(value)
    ? "Unavailable"
    : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
const changeLabel = (change: ChangeMetric) =>
  change.state === "new"
    ? "NEW"
    : change.percentage === null || !Number.isFinite(change.percentage)
      ? "N/A"
      : `${Math.abs(change.percentage)}%`;
const periodLabels: Record<InventoryPeriodPreset, string> = {
  weekly: "Last 7 Days",
  monthly: "Last 30 Days",
  quarterly: "Last 3 Months",
  halfYearly: "Last 6 Months",
  annual: "Last 12 Months",
  custom: "Custom Range",
};
const comparisonLabels: Record<InventoryComparisonMode, string> = {
  previousPeriod: "Previous Period",
  previousYear: "Previous Year",
};
const signalColor = (status: ProductSignalRow["status"] | string) =>
  status === "Critical" || status === "Dead stock candidate"
    ? "red"
    : status === "Reorder soon" ||
        status === "Overstock risk" ||
        status === "Slow moving" ||
        status === "Low"
      ? "orange"
      : status === "Healthy"
        ? "green"
        : "blue";
const categoryStatus = (row: CategoryPerformanceRow) => {
  switch (row.diagnostic.classification) {
    case "Overstock risk":
      return { label: "Too much stock", color: "red" };
    case "Strong demand / replenishment risk":
    case "Possible inventory constraint":
      return { label: "Restock soon", color: "orange" };
    case "Healthy":
      return { label: "Healthy", color: "green" };
    default:
      return { label: "Needs attention", color: "blue" };
  }
};

function BusinessMetricCard({
  title,
  value,
  icon,
  tone,
  change,
  secondary,
  tooltip,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "cyan" | "green";
  change?: ChangeMetric;
  secondary: React.ReactNode;
  tooltip?: string;
}) {
  const direction = change?.state === "increase" ? "↑" : change?.state === "decrease" ? "↓" : "";
  const unfavorable = change?.state === "decrease";
  return (
    <Card className={styles.metricCard} styles={{ body: { padding: 16 } }}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>
      <div className={styles.metricContent}>
        <div className={styles.metricLabel}>
          {title}
          {tooltip ? (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined aria-label={`About ${title}`} />
            </Tooltip>
          ) : null}
        </div>
        <div className={styles.metricValue}>{value}</div>
        <div className={styles.metricMeta}>
          {change ? (
            <span className={unfavorable ? styles.negativeChange : styles.positiveChange}>
              {direction} {changeLabel(change)}
            </span>
          ) : null}
          <span>{secondary}</span>
        </div>
      </div>
    </Card>
  );
}

function AttentionList({
  rows,
  empty,
  kind,
  onSelect,
}: {
  rows: ProductSignalRow[];
  empty: string;
  kind: "restock" | "overstock";
  onSelect: (row: ProductSignalRow) => void;
}) {
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
  return (
    <div className={styles.attentionList}>
      {rows.slice(0, 2).map((row) => (
        <button key={row.productId} type="button" onClick={() => onSelect(row)}>
          <span>
            <strong>{row.product}</strong>
            <small>
              {kind === "restock"
                ? row.unfulfilledDemand === null
                  ? `${row.unitsSold} sold in the selected period`
                  : `${row.unfulfilledDemand} customer requests missed`
                : `${row.currentStock} units in stock`}
            </small>
          </span>
          <b>
            {kind === "restock"
              ? `${row.currentStock} in stock`
              : row.daysSinceSale && row.daysSinceSale > 0
                ? `No sale in ${row.daysSinceSale}d`
                : `${row.unitsSold} sold`}
          </b>
        </button>
      ))}
    </div>
  );
}

export default function InventoryIntelligencePanel({
  storeId,
  compact = false,
}: {
  storeId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<InventoryPeriodPreset>("monthly");
  const [comparisonMode, setComparisonMode] = useState<InventoryComparisonMode>("previousPeriod");
  const [trendMode, setTrendMode] = useState<"actual" | "indexed">("actual");
  const [draftRange, setDraftRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryPerformanceRow | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>();
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [variantCategoryId, setVariantCategoryId] = useState<string>();
  const [categoryChartOpen, setCategoryChartOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const filters = {
    storeId,
    period,
    comparisonMode,
    customStart: appliedRange?.start,
    customEnd: appliedRange?.end,
  };
  const query = useInventoryIntelligence(filters);
  const data = query.data;
  const activeVariantCategoryId = variantCategoryId ?? data?.categoryPerformance[0]?.categoryId;
  const drilldownQuery = useInventoryDrilldown(filters, selectedCategory?.categoryId);
  const variantQuery = useInventoryDrilldown(filters, activeVariantCategoryId);
  const customRangeReady = period !== "custom" || Boolean(appliedRange);

  const openCategory = (
    category: CategoryPerformanceRow,
    product?: Pick<ProductSignalRow, "brandId" | "productId">
  ) => {
    setSelectedCategory(category);
    setSelectedBrandId(product?.brandId);
    setSelectedProductId(product?.productId);
  };
  const openProduct = (product: ProductSignalRow) => {
    const category = data?.categoryPerformance.find((row) => row.categoryId === product.categoryId);
    if (category) openCategory(category, product);
  };
  const categoryDrilldown = useMemo(() => drilldownQuery.data ?? [], [drilldownQuery.data]);
  const brandOptions = useMemo(
    () =>
      Array.from(new Map(categoryDrilldown.map((row) => [row.brandId, row.brand])).entries()).map(
        ([value, label]) => ({ value, label })
      ),
    [categoryDrilldown]
  );
  const productOptions = useMemo(
    () =>
      Array.from(
        new Map(
          categoryDrilldown
            .filter((row) => !selectedBrandId || row.brandId === selectedBrandId)
            .map((row) => [row.productId, `${row.product} (${row.sku})`])
        ).entries()
      ).map(([value, label]) => ({ value, label })),
    [categoryDrilldown, selectedBrandId]
  );
  const sizeRows = useMemo(
    () =>
      categoryDrilldown.filter(
        (row) =>
          (!selectedBrandId || row.brandId === selectedBrandId) &&
          (!selectedProductId || row.productId === selectedProductId)
      ),
    [categoryDrilldown, selectedBrandId, selectedProductId]
  );
  const variantRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        size: string;
        sold: number;
        stock: number;
        sellThrough: number | null;
        status: string;
      }
    >();
    for (const row of variantQuery.data ?? []) {
      const current = grouped.get(row.sizeId) ?? {
        key: row.sizeId,
        size: row.size,
        sold: 0,
        stock: 0,
        sellThrough: null,
        status: "Monitor",
      };
      current.sold += row.unitsSold;
      current.stock += row.currentStock;
      const match = data?.sizeInsights.find((size) => size.sizeId === row.sizeId);
      if (match) current.status = match.status;
      grouped.set(row.sizeId, current);
    }
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      sellThrough:
        row.sold + row.stock > 0
          ? Math.round((row.sold / (row.sold + row.stock)) * 1000) / 10
          : null,
    }));
  }, [data?.sizeInsights, variantQuery.data]);
  const applyCustom = () => {
    const startDay = draftRange?.[0];
    const endDay = draftRange?.[1]?.add(1, "day");
    if (!startDay || !endDay || !endDay.isAfter(startDay)) return;
    setAppliedRange({
      start: new Date(`${startDay.format("YYYY-MM-DD")}T00:00:00+05:30`).toISOString(),
      end: new Date(`${endDay.format("YYYY-MM-DD")}T00:00:00+05:30`).toISOString(),
    });
  };

  if (!storeId)
    return <Alert type="info" showIcon title="Choose a store to load Inventory Intelligence." />;
  const demandMissed = data?.lostDemand ? 100 - (data.lostDemand.fulfillmentRate ?? 0) : null;
  const inactiveUnits =
    data?.inactivity
      .filter((bucket) => bucket.label !== "0–30 days")
      .reduce((sum, bucket) => sum + bucket.units, 0) ?? 0;
  const stockCover = data?.kpis.stockCover.current ?? null;

  return (
    <div className={`${styles.page} ${compact ? styles.compact : ""}`}>
      <header className={styles.header}>
        <div>
          <Typography.Text className={styles.eyebrow}>
            Analytics &nbsp;›&nbsp; Inventory Intelligence
          </Typography.Text>
          <Typography.Title level={compact ? 3 : 2}>Inventory Intelligence</Typography.Title>
          <Typography.Text className={styles.subtitle}>
            Turn your sales, stock and customer demand into smarter decisions.
          </Typography.Text>
        </div>
        <div className={styles.controls}>
          <Select<InventoryPeriodPreset>
            aria-label="Analytics period"
            value={period}
            prefix={<CalendarOutlined />}
            onChange={(value) => {
              setPeriod(value);
              if (value !== "custom") setAppliedRange(null);
            }}
            options={Object.entries(periodLabels).map(([value, label]) => ({ value, label }))}
          />
          <Select<InventoryComparisonMode>
            aria-label="Comparison period"
            value={comparisonMode}
            onChange={setComparisonMode}
            options={Object.entries(comparisonLabels).map(([value, label]) => ({ value, label }))}
          />
          <Tooltip title="Refresh analytics">
            <Button
              aria-label="Refresh analytics"
              icon={<ReloadOutlined />}
              onClick={() => query.refetch()}
              loading={query.isFetching}
              disabled={!customRangeReady}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/demand")}
          >
            Record Customer Visit
          </Button>
        </div>
      </header>
      {period === "custom" ? (
        <div className={styles.customRange}>
          <DatePicker.RangePicker
            value={draftRange}
            onChange={(value) => setDraftRange(value as [Dayjs | null, Dayjs | null] | null)}
            allowClear
          />
          <Button
            type="primary"
            onClick={applyCustom}
            disabled={!draftRange?.[0] || !draftRange?.[1]}
          >
            Apply
          </Button>
        </div>
      ) : null}
      {period === "custom" && !appliedRange ? (
        <Alert type="info" showIcon title="Select a custom date range and choose Apply" />
      ) : query.isError ? (
        <Alert
          type="error"
          showIcon
          title="Inventory Intelligence could not be loaded"
          description={query.error.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : null}
      {period === "custom" && !appliedRange ? null : query.isLoading || !data ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className={styles.surface}>
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <section className={styles.kpiGrid} aria-label="Business snapshot">
            <BusinessMetricCard
              title="Sales"
              value={money(data.kpis.revenue.current)}
              icon={<BarChartOutlined />}
              tone="blue"
              change={data.kpis.revenue.change}
              secondary={`vs ${comparisonLabels[comparisonMode].toLowerCase()}`}
              tooltip="Net item revenue after dated returns and exchanges."
            />
            <BusinessMetricCard
              title="Units Sold"
              value={number(data.kpis.unitsSold.current)}
              icon={<ShoppingCartOutlined />}
              tone="cyan"
              change={data.kpis.unitsSold.change}
              secondary={`vs ${comparisonLabels[comparisonMode].toLowerCase()}`}
              tooltip="Net units sold after returns."
            />
            <BusinessMetricCard
              title="Customer Demand Fulfilled"
              value={
                data.lostDemand?.fulfillmentRate === null || !data.lostDemand
                  ? "Insufficient data"
                  : `${data.lostDemand.fulfillmentRate}%`
              }
              icon={<TeamOutlined />}
              tone="blue"
              secondary={
                demandMissed === null
                  ? "No customer demand recorded yet"
                  : `${number(demandMissed, "%")} of recorded demand was missed`
              }
              tooltip={
                data.lostDemand?.evidenceNote ??
                "Start recording customer visits to measure demand fulfilment."
              }
            />
            <BusinessMetricCard
              title="Inventory Value"
              value={money(data.kpis.inventoryValue.current)}
              icon={<AppstoreOutlined />}
              tone="green"
              secondary={
                <>
                  Stock cover:{" "}
                  {stockCover === null
                    ? "No recent sales"
                    : stockCover > 365
                      ? "> 1 year"
                      : `${number(stockCover)} days`}
                  {stockCover !== null ? (
                    <Tooltip title={`${number(stockCover)} days of stock cover`}>
                      <InfoCircleOutlined aria-label="Exact stock cover" />
                    </Tooltip>
                  ) : null}
                </>
              }
              tooltip="Current sellable quantity valued at product cost."
            />
          </section>
          <Alert
            className={styles.businessAlert}
            type={data.diagnostics.strength === "strong" ? "warning" : "info"}
            showIcon
            icon={<WarningFilled />}
            title={data.diagnostics.summary}
          />
          <section className={`${styles.surface} ${styles.attentionSection}`}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>What Needs Your Attention</h2>
                <p>Key insights to help you take action.</p>
              </div>
              <Button onClick={() => setInsightsOpen(true)}>View All Insights</Button>
            </div>
            <div className={styles.attentionGrid}>
              <article className={`${styles.attentionPanel} ${styles.restockPanel}`}>
                <div className={styles.panelTitle}>
                  <span className={styles.panelIcon}>
                    <ShoppingCartOutlined />
                  </span>
                  <span>
                    <strong>Restock Opportunities</strong>
                    <small>Items with customer demand but low stock.</small>
                  </span>
                  <Tag color="red">{data.highDemandLowStock.length} items</Tag>
                </div>
                <AttentionList
                  rows={data.highDemandLowStock}
                  empty="No restock opportunities detected."
                  kind="restock"
                  onSelect={openProduct}
                />
              </article>
              <article className={`${styles.attentionPanel} ${styles.overstockPanel}`}>
                <div className={styles.panelTitle}>
                  <span className={styles.panelIcon}>
                    <AppstoreOutlined />
                  </span>
                  <span>
                    <strong>Overstock / Slow Moving</strong>
                    <small>Items with high stock but low sales.</small>
                  </span>
                  <Tag color="orange">{data.overstock.length} items</Tag>
                </div>
                <AttentionList
                  rows={data.overstock}
                  empty="No slow-moving stock found for this period."
                  kind="overstock"
                  onSelect={openProduct}
                />
              </article>
              <article className={`${styles.attentionPanel} ${styles.demandPanel}`}>
                <div className={styles.panelTitle}>
                  <span className={styles.panelIcon}>
                    <TeamOutlined />
                  </span>
                  <span>
                    <strong>Customer Demand</strong>
                    <small>
                      {demandMissed === null
                        ? "No recorded demand yet."
                        : `${number(demandMissed, "%")} of recorded demand was not fulfilled.`}
                    </small>
                  </span>
                </div>
                {data.lostDemand?.requirements.length ? (
                  <ol className={styles.demandList}>
                    {data.lostDemand.requirements.slice(0, 4).map((row) => (
                      <li key={row.requirement}>{row.requirement}</li>
                    ))}
                  </ol>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Start recording visits to see unmet demand."
                  />
                )}
              </article>
            </div>
          </section>
          <div className={styles.middleGrid}>
            <section className={`${styles.surface} ${styles.chartSection}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Sales &amp; Stock Trend</h2>
                  <p>Units sold vs available stock over time.</p>
                </div>
                <Segmented
                  value={trendMode}
                  onChange={(value) => setTrendMode(value as "actual" | "indexed")}
                  options={[
                    { label: "Actual", value: "actual" },
                    { label: "Indexed", value: "indexed" },
                  ]}
                />
              </div>
              {data.trend.length ? (
                <ResponsiveContainer width="100%" height={255} minWidth={0}>
                  <ComposedChart
                    data={data.trend}
                    margin={{ top: 12, right: 8, bottom: 2, left: -14 }}
                  >
                    <CartesianGrid stroke="#e7edf5" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="sales"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="stock"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      formatter={(value, name, item) => [
                        trendMode === "indexed"
                          ? `${number(Number(value))} (actual ${number(Number(name === "Units Sold" ? item.payload.salesActual : item.payload.inventoryActual))})`
                          : number(Number(value)),
                        name,
                      ]}
                    />
                    <Legend iconType="circle" iconSize={8} />
              <Bar
                isAnimationActive={false}
                yAxisId="sales"
                      dataKey={trendMode === "actual" ? "salesActual" : "salesIndex"}
                      name="Units Sold"
                      fill="#3284f5"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
              <Line
                isAnimationActive={false}
                yAxisId="stock"
                      type="monotone"
                      dataKey={trendMode === "actual" ? "inventoryActual" : "inventoryIndex"}
                      name="Available Stock"
                      stroke="#12936f"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#12936f" }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No trend data for this period" />
              )}
            </section>
            <section className={`${styles.surface} ${styles.categorySection}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Category Health</h2>
                  <p>Sales, stock and performance by category.</p>
                </div>
                <Button onClick={() => setCategoryChartOpen(true)}>View Chart</Button>
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.businessTable}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Sales</th>
                      <th>Stock</th>
                      <th>Sell-through</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryPerformance.map((row) => {
                      const status = categoryStatus(row);
                      return (
                        <tr
                          key={row.categoryId}
                          tabIndex={0}
                          onClick={() => openCategory(row)}
                          onKeyDown={(event) => event.key === "Enter" && openCategory(row)}
                        >
                          <td>
                            <strong>{row.category}</strong>
                          </td>
                          <td>{money(row.revenue)}</td>
                          <td>{row.currentStock}</td>
                          <td>{number(row.sellThrough, "%")}</td>
                          <td>
                            <Tag color={status.color}>{status.label}</Tag>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <div className={styles.bottomGrid}>
            <section className={`${styles.surface} ${styles.variantSection}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Size &amp; Variant Demand</h2>
                  <p>Sales and stock by variant for the selected category.</p>
                </div>
                <Select
                  aria-label="Category for variant demand"
                  value={activeVariantCategoryId}
                  onChange={setVariantCategoryId}
                  options={data.categoryPerformance.map((row) => ({
                    value: row.categoryId,
                    label: row.category,
                  }))}
                />
              </div>
              {variantQuery.isLoading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : variantRows.length ? (
                <div className={styles.tableScroll}>
                  <table className={styles.businessTable}>
                    <thead>
                      <tr>
                        <th>Size / Variant</th>
                        <th>Sold</th>
                        <th>Stock</th>
                        <th>Sell-through</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.slice(0, 7).map((row) => (
                        <tr key={row.key}>
                          <td>
                            <strong>{row.size}</strong>
                          </td>
                          <td>{row.sold}</td>
                          <td>{row.stock}</td>
                          <td>{number(row.sellThrough, "%")}</td>
                          <td>
                            <Tag color={signalColor(row.status)}>{row.status}</Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No variants found for this category"
                />
              )}
            </section>
            <section className={`${styles.surface} ${styles.healthSection}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Inventory Health</h2>
                  <p>Availability, inactivity and stock efficiency.</p>
                </div>
              </div>
              <div className={styles.healthList}>
                <div>
                  <span className={styles.healthGreen}>
                    <TeamOutlined />
                  </span>
                  <p>
                    <strong>Inventory Availability</strong>
                    <small>
                      {data.sizeAvailabilityScore === null
                        ? "Insufficient demand data"
                        : `${data.sizeAvailabilityScore}% demand-weighted availability`}
                    </small>
                  </p>
                </div>
                <div>
                  <span className={styles.healthAmber}>
                    <ClockCircleOutlined />
                  </span>
                  <p>
                    <strong>Inventory Efficiency</strong>
                    <small>{data.diagnostics.classification}</small>
                  </p>
                </div>
                <div>
                  <span className={styles.healthRed}>
                    <RiseOutlined />
                  </span>
                  <p>
                    <strong>Inactive Stock</strong>
                    <small>
                      {inactiveUnits
                        ? `${number(inactiveUnits)} units inactive for 30+ days`
                        : "No inactive units detected"}
                    </small>
                  </p>
                </div>
                <div>
                  <span className={styles.healthBlue}>
                    <AppstoreOutlined />
                  </span>
                  <p>
                    <strong>Replenishment Suggestions</strong>
                    <small>
                      {data.replenishment.length
                        ? `${data.replenishment.length} items to review`
                        : "No items currently need review"}
                    </small>
                  </p>
                </div>
              </div>
            </section>
            <section className={`${styles.surface} ${styles.insightSection}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>What the Numbers Are Telling You</h2>
                  <p>Simple insights based on your data.</p>
                </div>
              </div>
              <div className={styles.insightList}>
                <div>
                  <span className={styles.insightRed}>
                    <RiseOutlined />
                  </span>
                  <p>
                    <strong>{data.diagnostics.classification}</strong>
                    <small>{data.diagnostics.summary}</small>
                  </p>
                </div>
                {data.lostDemand ? (
                  <div>
                    <span className={styles.insightAmber}>
                      <WarningFilled />
                    </span>
                    <p>
                      <strong>Some customer requests were missed</strong>
                      <small>
                        {data.lostDemand.unfulfilledQuantity} of {data.lostDemand.observedDemand}{" "}
                        requested units were not fulfilled.
                      </small>
                    </p>
                  </div>
                ) : null}
                <div>
                  <span className={styles.insightBlue}>
                    <BulbOutlined />
                  </span>
                  <p>
                    <strong>Review buying decisions</strong>
                    <small>
                      {data.overstock.length
                        ? `${data.overstock.length} slow-moving or overstocked items need attention.`
                        : "No overstock risks detected in this period."}
                    </small>
                  </p>
                </div>
              </div>
            </section>
          </div>
          <Modal
            title="Category sales and stock movement"
            open={categoryChartOpen}
            onCancel={() => setCategoryChartOpen(false)}
            footer={null}
            width={760}
          >
            <ResponsiveContainer width="100%" height={360} minWidth={0}>
              <ScatterChart margin={{ top: 18, right: 22, bottom: 18, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Stock change" unit="%" />
                <YAxis type="number" dataKey="y" name="Sales change" unit="%" />
                <ZAxis type="number" dataKey="z" name="Units" range={[70, 350]} />
                <ReferenceLine x={0} stroke="#94a3b8" />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.category ?? "Category"}
                />
                <Scatter
                  name="Categories"
                  data={data.categoryPerformance
                    .filter(
                      (row) =>
                        row.salesChange.percentage !== null && row.stockChange.percentage !== null
                    )
                    .map((row) => ({
                      x: row.stockChange.percentage,
                      y: row.salesChange.percentage,
                      z: Math.max(1, row.unitsSold),
                      category: row.category,
                      source: row,
                    }))}
                  fill="#2f7df4"
                  onClick={(point) => {
                    const category = point.payload?.source as CategoryPerformanceRow | undefined;
                    if (category) {
                      setCategoryChartOpen(false);
                      openCategory(category);
                    }
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Modal>
          <Drawer
            title="All inventory insights"
            open={insightsOpen}
            onClose={() => setInsightsOpen(false)}
            size="min(720px, 100vw)"
          >
            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
              <Alert
                showIcon
                type={data.diagnostics.strength === "strong" ? "warning" : "info"}
                title={data.diagnostics.classification}
                description={data.diagnostics.summary}
              />
              {data.diagnosticEvidence.map((group) => (
                <Card
                  key={group.key}
                  size="small"
                  title={group.title}
                  extra={
                    <Tag color={group.state === "available" ? "green" : "default"}>
                      {group.state === "available" ? "Analysed" : "Unavailable"}
                    </Tag>
                  }
                >
                  <Space orientation="vertical" size={4}>
                    {group.signals.map((signal) => (
                      <Typography.Text key={signal}>{signal}</Typography.Text>
                    ))}
                    {group.note ? (
                      <Typography.Text type="secondary">{group.note}</Typography.Text>
                    ) : null}
                  </Space>
                </Card>
              ))}
            </Space>
          </Drawer>
        </>
      )}
      <Drawer
        title={selectedCategory?.category ?? "Category detail"}
        open={Boolean(selectedCategory)}
        onClose={() => {
          setSelectedCategory(null);
          setSelectedBrandId(undefined);
          setSelectedProductId(undefined);
        }}
        size="min(700px, 100vw)"
      >
        {selectedCategory ? (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              showIcon
              type="info"
              title={selectedCategory.diagnostic.classification}
              description={selectedCategory.diagnostic.summary}
            />
            <div className={styles.drawerMetrics}>
              {[
                ["Revenue", money(selectedCategory.revenue)],
                ["Units sold", number(selectedCategory.unitsSold)],
                ["Average stock", number(selectedCategory.averageStock)],
                ["Current stock", number(selectedCategory.currentStock)],
                ["Inventory value", money(selectedCategory.inventoryValue)],
                ["Sell-through", number(selectedCategory.sellThrough, "%")],
                [
                  "Stock cover",
                  selectedCategory.stockCoverDays === null
                    ? "No sales"
                    : `${selectedCategory.stockCoverDays} days`,
                ],
                ["Gross margin", money(selectedCategory.grossMargin)],
              ].map(([label, value]) => (
                <Card size="small" key={label}>
                  <Typography.Text type="secondary">{label}</Typography.Text>
                  <div className={styles.drawerMetricValue}>{value}</div>
                </Card>
              ))}
            </div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Brand → Product → Size
            </Typography.Title>
            <Flex gap={8} wrap>
              <Select
                aria-label="Filter category detail by brand"
                placeholder="All brands"
                allowClear
                value={selectedBrandId}
                options={brandOptions}
                style={{ minWidth: 180, flex: 1 }}
                onChange={(value) => {
                  setSelectedBrandId(value);
                  setSelectedProductId(undefined);
                }}
              />
              <Select
                aria-label="Filter category detail by product"
                placeholder="All products"
                allowClear
                value={selectedProductId}
                options={productOptions}
                style={{ minWidth: 220, flex: 1 }}
                onChange={setSelectedProductId}
              />
            </Flex>
            {drilldownQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : drilldownQuery.isError ? (
              <Alert
                type="error"
                showIcon
                title="Category detail could not be loaded"
                description={drilldownQuery.error.message}
                action={<Button onClick={() => drilldownQuery.refetch()}>Try again</Button>}
              />
            ) : sizeRows.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching variants" />
            ) : (
              <Table<InventoryDrilldownRow>
                rowKey={(row) => `${row.productId}:${row.sizeId}`}
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
                dataSource={sizeRows}
                columns={[
                  {
                    title: "Product",
                    dataIndex: "product",
                    fixed: "left",
                    width: 180,
                    render: (value, row) => (
                      <>
                        <strong>{value}</strong>
                        <small className={styles.tableSubtext}>
                          {row.brand} · {row.sku}
                        </small>
                      </>
                    ),
                  },
                  { title: "Size", dataIndex: "size" },
                  { title: "Revenue", dataIndex: "revenue", render: money },
                  { title: "Units", dataIndex: "unitsSold" },
                  { title: "Margin", dataIndex: "grossMargin", render: money },
                  { title: "Stock", dataIndex: "currentStock" },
                  {
                    title: "Sell-through",
                    dataIndex: "sellThrough",
                    render: (value) => number(value, "%"),
                  },
                  {
                    title: "Cover",
                    dataIndex: "stockCoverDays",
                    render: (value) => (value === null ? "No sales" : `${value}d`),
                  },
                ]}
              />
            )}
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
