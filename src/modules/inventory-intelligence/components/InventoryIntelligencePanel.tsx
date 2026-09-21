"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Flex,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  ComparableMetric,
  InventoryComparisonMode,
  InventoryDrilldownRow,
  InventoryPeriodPreset,
  ProductSignalRow,
} from "../types";

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

const changeLabel = (change: ChangeMetric) => {
  if (change.state === "new") return "NEW";
  if (change.percentage === null || !Number.isFinite(change.percentage)) return "N/A";
  const prefix = change.percentage > 0 ? "+" : "";
  return `${prefix}${change.percentage}%`;
};

const changeColor = (change: ChangeMetric) =>
  change.state === "increase" ? "blue" : change.state === "decrease" ? "orange" : "default";

const absoluteChangeLabel = (change: ChangeMetric, formatter: (value: number | null) => string) => {
  if (change.state === "notApplicable") return "Δ N/A";
  const prefix = change.absolute > 0 ? "+" : "";
  return `Δ ${prefix}${formatter(change.absolute)}`;
};

function MetricCard({
  title,
  metric,
  formatter,
  tooltip,
  neutralChange = false,
}: {
  title: string;
  metric: ComparableMetric;
  formatter: (value: number | null) => string;
  tooltip: string;
  neutralChange?: boolean;
}) {
  return (
    <Card size="small" styles={{ body: { padding: 14 } }} style={{ height: "100%" }}>
      <Flex align="center" gap={6}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Typography.Text>
        <Tooltip title={tooltip}>
          <InfoCircleOutlined style={{ color: "var(--text-faint)", fontSize: 12 }} />
        </Tooltip>
      </Flex>
      <div
        style={{
          fontSize: 22,
          fontWeight: 650,
          marginTop: 8,
          color: metric.current === null ? "var(--text-faint)" : "var(--text-primary)",
        }}
      >
        {formatter(metric.current)}
      </div>
      <Flex align="center" gap={8} style={{ marginTop: 7 }} wrap>
        <Tooltip title="Percentage change from the comparison period">
          <Tag color={neutralChange ? "default" : changeColor(metric.change)} style={{ margin: 0 }}>
            {changeLabel(metric.change)}
          </Tag>
        </Tooltip>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {absoluteChangeLabel(metric.change, formatter)} · vs {formatter(metric.comparison)}
        </Typography.Text>
      </Flex>
      {metric.note ? (
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 10 }}>
          {metric.note}
        </Typography.Text>
      ) : null}
    </Card>
  );
}

const signalColor = (status: ProductSignalRow["status"]) => {
  if (status === "Critical" || status === "Dead stock candidate") return "red";
  if (status === "Reorder soon" || status === "Overstock risk" || status === "Slow moving")
    return "orange";
  return status === "Healthy" ? "green" : "blue";
};

function ProductSignalTable({
  rows,
  empty,
  onSelect,
}: {
  rows: ProductSignalRow[];
  empty: string;
  onSelect?: (row: ProductSignalRow) => void;
}) {
  return rows.length === 0 ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
  ) : (
    <div style={{ overflowX: "auto" }}>
      <table className="ii-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Units</th>
            <th>Stock</th>
            <th>Cover</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.productId}
              onClick={() => onSelect?.(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelect?.(row);
              }}
              tabIndex={onSelect ? 0 : undefined}
              style={{ cursor: onSelect ? "pointer" : undefined }}
            >
              <td>
                <strong>{row.product}</strong>
                <small>
                  {row.sku} · {row.category}
                </small>
              </td>
              <td>{row.unitsSold}</td>
              <td>{row.currentStock}</td>
              <td>{row.stockCoverDays === null ? "—" : `${row.stockCoverDays}d`}</td>
              <td>
                <Tag color={signalColor(row.status)}>{row.status}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [period, setPeriod] = useState<InventoryPeriodPreset>("monthly");
  const [comparisonMode, setComparisonMode] = useState<InventoryComparisonMode>("previousPeriod");
  const [draftRange, setDraftRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryPerformanceRow | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>();
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const filters = {
    storeId,
    period,
    comparisonMode,
    customStart: appliedRange?.start,
    customEnd: appliedRange?.end,
  };
  const query = useInventoryIntelligence(filters);
  const data = query.data;
  const drilldownQuery = useInventoryDrilldown(filters, selectedCategory?.categoryId);
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
  const drawerEvidence = useMemo(() => {
    const revenue = categoryDrilldown.reduce((sum, row) => sum + row.revenue, 0);
    const comparisonRevenue = categoryDrilldown.reduce(
      (sum, row) => sum + row.comparisonRevenue,
      0
    );
    const units = categoryDrilldown.reduce((sum, row) => sum + row.unitsSold, 0);
    const comparisonUnits = categoryDrilldown.reduce(
      (sum, row) => sum + row.comparisonUnitsSold,
      0
    );
    const productRevenue = new Map<string, number>();
    const comparisonProductRevenue = new Map<string, number>();
    categoryDrilldown.forEach((row) => {
      productRevenue.set(row.productId, (productRevenue.get(row.productId) ?? 0) + row.revenue);
      comparisonProductRevenue.set(
        row.productId,
        (comparisonProductRevenue.get(row.productId) ?? 0) + row.comparisonRevenue
      );
    });
    const topFiveShare = (values: Map<string, number>, total: number) =>
      total > 0
        ? (Array.from(values.values())
            .sort((a, b) => b - a)
            .slice(0, 5)
            .reduce((sum, value) => sum + Math.max(0, value), 0) /
            total) *
          100
        : null;
    return {
      realizedPrice: units > 0 ? revenue / units : null,
      comparisonRealizedPrice: comparisonUnits > 0 ? comparisonRevenue / comparisonUnits : null,
      topFiveShare: topFiveShare(productRevenue, revenue),
      comparisonTopFiveShare: topFiveShare(comparisonProductRevenue, comparisonRevenue),
    };
  }, [categoryDrilldown]);

  const columns = useMemo<ColumnsType<CategoryPerformanceRow>>(
    () => [
      { title: "Category", dataIndex: "category", fixed: "left", width: 150 },
      {
        title: "Revenue",
        dataIndex: "revenue",
        align: "right",
        sorter: (a, b) => a.revenue - b.revenue,
        render: money,
      },
      {
        title: "Units sold",
        dataIndex: "unitsSold",
        align: "right",
        sorter: (a, b) => a.unitsSold - b.unitsSold,
      },
      {
        title: "Sales Δ",
        dataIndex: "salesChange",
        align: "right",
        render: (value: ChangeMetric, row) => (
          <Tooltip
            title={`${money(row.comparisonRevenue)} → ${money(row.revenue)}; ${row.comparisonUnitsSold} → ${row.unitsSold} units`}
          >
            <Tag color={changeColor(value)}>{changeLabel(value)}</Tag>
          </Tooltip>
        ),
      },
      {
        title: "Avg. stock",
        dataIndex: "averageStock",
        align: "right",
        sorter: (a, b) => (a.averageStock ?? -1) - (b.averageStock ?? -1),
        render: (value: number | null) => number(value),
      },
      {
        title: "Stock Δ",
        dataIndex: "stockChange",
        align: "right",
        sorter: (a, b) =>
          (a.stockChange.percentage ?? -Infinity) - (b.stockChange.percentage ?? -Infinity),
        render: (value: ChangeMetric) => <Tag>{changeLabel(value)}</Tag>,
      },
      {
        title: "Current stock",
        dataIndex: "currentStock",
        align: "right",
        sorter: (a, b) => a.currentStock - b.currentStock,
      },
      {
        title: "Sell-through",
        dataIndex: "sellThrough",
        align: "right",
        sorter: (a, b) => (a.sellThrough ?? -1) - (b.sellThrough ?? -1),
        render: (value: number | null) => number(value, "%"),
      },
      {
        title: "Stockouts",
        dataIndex: "stockoutDays",
        align: "right",
        render: (value: number | null) => (value === null ? "Unavailable" : `${value}d`),
      },
      {
        title: "Cover",
        dataIndex: "stockCoverDays",
        align: "right",
        render: (value: number | null) => (value === null ? "No sales" : `${value}d`),
      },
      {
        title: "Gross margin",
        dataIndex: "grossMargin",
        align: "right",
        sorter: (a, b) => (a.grossMargin ?? -1) - (b.grossMargin ?? -1),
        render: money,
      },
      {
        title: "Signal",
        dataIndex: ["diagnostic", "classification"],
        width: 210,
        render: (value: string) => <Tag>{value}</Tag>,
      },
    ],
    []
  );

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

  return (
    <div className="inventory-intelligence">
      <Flex justify="space-between" align="flex-start" gap={16} wrap style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={compact ? 4 : 3} style={{ margin: 0 }}>
            Inventory Intelligence
          </Typography.Title>
          <Typography.Text type="secondary">
            Understand how sales, demand and inventory availability are affecting store performance.
          </Typography.Text>
        </div>
        <Space wrap className="ii-controls">
          <Select<InventoryPeriodPreset>
            aria-label="Analytics period"
            value={period}
            onChange={(value) => {
              setPeriod(value);
              if (value !== "custom") setAppliedRange(null);
            }}
            style={{ width: 145 }}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "halfYearly", label: "Half-Yearly" },
              { value: "annual", label: "Annual" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <Select<InventoryComparisonMode>
            aria-label="Comparison period"
            value={comparisonMode}
            onChange={setComparisonMode}
            style={{ width: 155 }}
            options={[
              { value: "previousPeriod", label: "Previous Period" },
              { value: "previousYear", label: "Previous Year" },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => query.refetch()}
            loading={query.isFetching}
            disabled={!customRangeReady}
          >
            Refresh
          </Button>
        </Space>
      </Flex>

      {period === "custom" ? (
        <Flex gap={8} wrap style={{ marginBottom: 14 }}>
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
        </Flex>
      ) : null}

      {period === "custom" && !appliedRange ? (
        <Alert
          type="info"
          showIcon
          title="Select a custom date range and choose Apply"
          style={{ marginBottom: 16 }}
        />
      ) : query.isError ? (
        <Alert
          type="error"
          showIcon
          title="Inventory Intelligence could not be loaded"
          description={query.error.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {period === "custom" && !appliedRange ? null : query.isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 18 }} />
      ) : (
        <>
          <Alert
            type={data.methodology.stockHistoryReliable ? "info" : "warning"}
            showIcon
            title={`${data.range.current.label} vs ${data.range.comparison.label}`}
            description={
              data.methodology.stockHistoryNote ??
              "Current and comparison periods use equivalent elapsed durations."
            }
            style={{ marginBottom: 14 }}
          />

          <div className="ii-kpis">
            <MetricCard
              title="Revenue"
              metric={data.kpis.revenue}
              formatter={money}
              tooltip="Net item revenue after dated returns and exchanges."
            />
            <MetricCard
              title="Units Sold"
              metric={data.kpis.unitsSold}
              formatter={(v) => number(v)}
              tooltip="Net units sold after returns."
            />
            <MetricCard
              title="Gross Margin"
              metric={data.kpis.grossMargin}
              formatter={money}
              tooltip="Net item revenue less historical cost snapshots."
            />
            <MetricCard
              title="Gross Margin %"
              metric={data.kpis.grossMarginPercent}
              formatter={(v) => number(v, "%")}
              tooltip="Gross margin divided by net item revenue when historical costs are complete."
            />
            <MetricCard
              title="Inventory Value"
              metric={data.kpis.inventoryValue}
              formatter={money}
              tooltip="Current sellable quantity valued at product cost."
              neutralChange
            />
            <MetricCard
              title="Sell-Through"
              metric={data.kpis.sellThrough}
              formatter={(v) => number(v, "%")}
              tooltip="Net units sold divided by opening stock plus inbound units."
            />
            <MetricCard
              title="Stock Cover"
              metric={data.kpis.stockCover}
              formatter={(v) => (v === null ? "No recent sales" : `${v} days`)}
              tooltip="Estimated selling days supported by current stock at recent velocity."
              neutralChange
            />
          </div>

          <Card
            title="Sales vs Inventory Trend"
            className="ii-section"
            extra={
              <Typography.Text type="secondary">
                Normalized index (first non-zero observation = 100)
              </Typography.Text>
            }
          >
            {data.trend.length === 0 ? (
              <Empty description="No trend data" />
            ) : (
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <LineChart data={data.trend} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                  <ChartTooltip
                    formatter={(value, name, item) => [
                      `${number(Number(value))} (actual ${number(Number(name === "Sales Index" ? item.payload.salesActual : item.payload.inventoryActual))})`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="salesIndex"
                    name="Sales Index"
                    stroke="#2563eb"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="inventoryIndex"
                    name="Inventory Availability Index"
                    stroke="#0f766e"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Similar movement is an association and does not necessarily mean inventory caused the
              sales change.
            </Typography.Text>
            {data.correlation ? (
              <Tag style={{ marginLeft: 8 }}>{data.correlation.description}</Tag>
            ) : null}
          </Card>

          <Card title="Category Performance" className="ii-section">
            <Table<CategoryPerformanceRow>
              rowKey="categoryId"
              columns={columns}
              dataSource={data.categoryPerformance}
              size="small"
              pagination={false}
              scroll={{ x: 1500 }}
              onRow={(row) => ({
                onClick: () => openCategory(row),
                tabIndex: 0,
                onKeyDown: (event) => {
                  if (event.key === "Enter") openCategory(row);
                },
                style: { cursor: "pointer" },
              })}
              locale={{ emptyText: <Empty description="No category activity in this period" /> }}
            />
            <div style={{ marginTop: 18 }}>
              <Typography.Text strong>Sales Change vs Stock Change</Typography.Text>
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
                    formatter={(value, name) => [
                      name === "Units" ? number(Number(value)) : `${value}%`,
                      name,
                    ]}
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
                    fill="#7c3aed"
                    onClick={(point) => {
                      const category = point.payload?.source as CategoryPerformanceRow | undefined;
                      if (category) openCategory(category);
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Upper-right: growing with stock support · Upper-left: replenishment opportunity ·
                Lower-right: overstock/demand risk · Lower-left: investigate. Bubble area reflects
                units sold, so small-volume percentage changes remain visibly contextualized.
              </Typography.Text>
            </div>
          </Card>

          <div className="ii-two-column">
            <Card title="High Demand / Low Stock" className="ii-section">
              <ProductSignalTable
                rows={data.highDemandLowStock}
                empty="No immediate replenishment risks detected"
                onSelect={openProduct}
              />
            </Card>
            <Card title="Overstock / Slow Moving" className="ii-section">
              <ProductSignalTable
                rows={data.overstock}
                empty="No overstock risks detected"
                onSelect={openProduct}
              />
            </Card>
          </div>

          <Card
            title="Size Availability & Demand"
            className="ii-section"
            extra={
              data.sizeAvailabilityScore === null ? null : (
                <Tooltip title="Sales demand share × historical in-stock percentage, summed across sizes. High-demand unavailable sizes reduce the score most.">
                  <Tag color="blue">Demand-weighted availability {data.sizeAvailabilityScore}%</Tag>
                </Tooltip>
              )
            }
          >
            <div style={{ overflowX: "auto" }}>
              <table className="ii-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Demand Share</th>
                    <th>Units Sold</th>
                    <th>Current Stock</th>
                    <th>Sell-through</th>
                    <th>Stockout Days</th>
                    <th>Availability</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sizeInsights.map((row) => (
                    <tr key={row.sizeId}>
                      <td>
                        <strong>{row.size}</strong>
                      </td>
                      <td>{row.demandShare}%</td>
                      <td>{row.unitsSold}</td>
                      <td>{row.currentStock}</td>
                      <td>{number(row.sellThrough, "%")}</td>
                      <td>{row.stockoutDays === null ? "Unavailable" : `${row.stockoutDays}d`}</td>
                      <td>{row.availability === null ? "Unavailable" : `${row.availability}%`}</td>
                      <td>
                        <Tag>{row.status}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Lost Demand Signals" className="ii-section">
            <Alert
              type="info"
              showIcon
              title="Lost-demand data unavailable"
              description="This Stockiva branch does not persist visitor interest, conversion outcomes, non-conversion reasons, or requested product/size context. No demand counts or revenue estimates are fabricated."
            />
          </Card>

          <div className="ii-two-column">
            <Card
              title="Inventory Inactivity"
              className="ii-section"
              extra={
                <Tooltip title="A proxy based on days since last sale; this is not FIFO inventory ageing.">
                  <InfoCircleOutlined />
                </Tooltip>
              }
            >
              <ResponsiveContainer width="100%" height={250} minWidth={0}>
                <BarChart data={data.inactivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="costValue" name="Cost value" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table className="ii-table">
                  <thead>
                    <tr>
                      <th>Inactivity bucket</th>
                      <th>Units</th>
                      <th>Cost value</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inactivity.map((bucket) => (
                      <tr key={bucket.label}>
                        <td>{bucket.label}</td>
                        <td>{number(bucket.units)}</td>
                        <td>{money(bucket.costValue)}</td>
                        <td>{number(bucket.percentage, "%")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Replenishment Opportunities" className="ii-section">
              <ProductSignalTable
                rows={data.replenishment}
                empty="No replenishment signal meets the current thresholds"
                onSelect={openProduct}
              />
            </Card>
          </div>

          <Card title="Performance Diagnostics" className="ii-section">
            <Flex gap={10} align="center" wrap>
              <Tag color={data.diagnostics.strength === "strong" ? "orange" : "blue"}>
                {data.diagnostics.classification}
              </Tag>
              <Typography.Text strong>Strongest observed signal</Typography.Text>
            </Flex>
            <Typography.Paragraph style={{ marginTop: 10, marginBottom: 8 }}>
              {data.diagnostics.summary}
            </Typography.Paragraph>
            <Space wrap>
              {data.diagnostics.signals.map((signal) => (
                <Tag key={signal}>{signal}</Tag>
              ))}
            </Space>
            <div className="ii-evidence-grid">
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
                  {group.signals.length ? (
                    <Space orientation="vertical" size={4}>
                      {group.signals.map((signal) => (
                        <Typography.Text key={signal}>{signal}</Typography.Text>
                      ))}
                    </Space>
                  ) : null}
                  {group.note ? (
                    <Typography.Text
                      type="secondary"
                      style={{ display: "block", marginTop: group.signals.length ? 8 : 0 }}
                    >
                      {group.note}
                    </Typography.Text>
                  ) : null}
                </Card>
              ))}
            </div>
          </Card>
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
        size="min(620px, 100vw)"
      >
        {selectedCategory ? (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              showIcon
              type="info"
              title={selectedCategory.diagnostic.classification}
              description={selectedCategory.diagnostic.summary}
            />
            <div className="ii-drawer-grid">
              {[
                ["Revenue", money(selectedCategory.revenue)],
                ["Units sold", number(selectedCategory.unitsSold)],
                ["Average stock", number(selectedCategory.averageStock)],
                ["Stock change", changeLabel(selectedCategory.stockChange)],
                ["Current stock", number(selectedCategory.currentStock)],
                ["Inventory value", money(selectedCategory.inventoryValue)],
                ["Sell-through", number(selectedCategory.sellThrough, "%")],
                [
                  "Stock cover",
                  selectedCategory.stockCoverDays === null
                    ? "No sales"
                    : `${selectedCategory.stockCoverDays} days`,
                ],
                [
                  "Stockout days",
                  selectedCategory.stockoutDays === null
                    ? "Unavailable"
                    : number(selectedCategory.stockoutDays),
                ],
                ["Gross margin", money(selectedCategory.grossMargin)],
                [
                  "Gross margin %",
                  selectedCategory.grossMargin === null || selectedCategory.revenue === 0
                    ? "Unavailable"
                    : number((selectedCategory.grossMargin / selectedCategory.revenue) * 100, "%"),
                ],
              ].map(([label, value]) => (
                <Card size="small" key={label}>
                  <Typography.Text type="secondary">{label}</Typography.Text>
                  <div style={{ fontSize: 18, fontWeight: 650, marginTop: 5 }}>{value}</div>
                </Card>
              ))}
            </div>
            {!drilldownQuery.isLoading && !drilldownQuery.isError ? (
              <div className="ii-drawer-evidence">
                <Card size="small" title="Pricing evidence">
                  <Typography.Text>
                    Realized unit price: {money(drawerEvidence.realizedPrice)} vs{" "}
                    {money(drawerEvidence.comparisonRealizedPrice)}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                    Based on historical net line revenue, not current catalogue price.
                  </Typography.Text>
                </Card>
                <Card size="small" title="Product mix evidence">
                  <Typography.Text>
                    Top-five product revenue share: {number(drawerEvidence.topFiveShare, "%")} vs{" "}
                    {number(drawerEvidence.comparisonTopFiveShare, "%")}
                  </Typography.Text>
                </Card>
              </div>
            ) : null}
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
              <div style={{ overflowX: "auto" }}>
                <table className="ii-table">
                  <thead>
                    <tr>
                      <th>Brand / Product</th>
                      <th>Size</th>
                      <th>Revenue</th>
                      <th>Revenue Δ</th>
                      <th>Units</th>
                      <th>Margin</th>
                      <th>Margin %</th>
                      <th>Avg. stock</th>
                      <th>Stock Δ</th>
                      <th>Stock</th>
                      <th>Sell-through</th>
                      <th>Cover</th>
                      <th>Stockouts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row: InventoryDrilldownRow) => (
                      <tr key={`${row.productId}:${row.sizeId}`}>
                        <td>
                          <strong>{row.product}</strong>
                          <small>
                            {row.brand} · {row.sku}
                          </small>
                        </td>
                        <td>{row.size}</td>
                        <td>{money(row.revenue)}</td>
                        <td>
                          <Tag color={changeColor(row.revenueChange)}>
                            {changeLabel(row.revenueChange)}
                          </Tag>
                        </td>
                        <td>{row.unitsSold}</td>
                        <td>{money(row.grossMargin)}</td>
                        <td>
                          {row.grossMargin === null || row.revenue === 0
                            ? "Unavailable"
                            : number((row.grossMargin / row.revenue) * 100, "%")}
                        </td>
                        <td>{number(row.averageStock)}</td>
                        <td>
                          <Tag color={changeColor(row.stockChange)}>
                            {changeLabel(row.stockChange)}
                          </Tag>
                        </td>
                        <td>{row.currentStock}</td>
                        <td>{number(row.sellThrough, "%")}</td>
                        <td>
                          {row.stockCoverDays === null ? "No sales" : `${row.stockCoverDays}d`}
                        </td>
                        <td>
                          {row.stockoutDays === null ? "Unavailable" : `${row.stockoutDays}d`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Space>
        ) : null}
      </Drawer>

      <style jsx global>{`
        .inventory-intelligence .ii-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .inventory-intelligence .ii-section {
          margin-bottom: 14px;
          border-color: var(--border-primary);
        }
        .inventory-intelligence .ii-two-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .inventory-intelligence .ii-table,
        .ant-drawer .ii-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
          font-size: 12px;
        }
        .inventory-intelligence .ii-table th,
        .ant-drawer .ii-table th {
          text-align: left;
          color: var(--text-muted);
          font-weight: 600;
          padding: 9px 8px;
          border-bottom: 1px solid var(--border-primary);
        }
        .inventory-intelligence .ii-table td,
        .ant-drawer .ii-table td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: top;
        }
        .inventory-intelligence .ii-table small,
        .ant-drawer .ii-table small {
          display: block;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .ii-drawer-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .ii-drawer-evidence {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }
        .ii-evidence-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        @media (max-width: 1200px) {
          .inventory-intelligence .ii-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .ii-evidence-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 767px) {
          .inventory-intelligence .ii-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .inventory-intelligence .ii-two-column {
            grid-template-columns: 1fr;
          }
          .ii-drawer-grid {
            grid-template-columns: 1fr;
          }
          .ii-drawer-evidence {
            grid-template-columns: 1fr;
          }
          .ii-evidence-grid {
            grid-template-columns: 1fr;
          }
          .inventory-intelligence .ii-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }
          .inventory-intelligence .ii-controls > .ant-space-item,
          .inventory-intelligence .ii-controls .ant-select,
          .inventory-intelligence .ii-controls .ant-btn {
            width: 100% !important;
          }
        }
        @media (max-width: 420px) {
          .inventory-intelligence .ii-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
