"use client";

import {
  BarChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Alert, Button, Skeleton } from "antd";
import dayjs from "dayjs";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/providers/StoreProvider";
import type { SalesAnalyticsPoint } from "../types";
import { useAnalyticsDateRange } from "../hooks/useAnalyticsDateRange";
import { usePaymentDistribution, useSalesAnalytics } from "../hooks/useAnalytics";
import AnalyticsDateFilter from "./AnalyticsDateFilter";
import SalesPaymentDistribution from "./SalesPaymentDistribution";
import styles from "./AnalyticsPage.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const groupLabel = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
} as const;

function SalesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  const point = payload?.[0]?.payload as SalesAnalyticsPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className={styles.chartTooltip}>
      <strong>{point.label}</strong>
      <div>
        <i className={styles.salesDot} /> <span>Net sales</span>
        <b>{money(point.revenue)}</b>
      </div>
      <div>
        <i className={styles.profitDot} /> <span>Gross profit</span>
        <b>{point.grossProfit == null ? "Unavailable" : money(point.grossProfit)}</b>
      </div>
      <div>
        <i className={styles.discountDot} /> <span>Discounts</span>
        <b>{money(point.discount)}</b>
      </div>
    </div>
  );
}

export default function SalesAnalyticsPage() {
  const { storeId, storeName } = useStore();
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("today");
  const filters = {
    storeId: storeId ?? undefined,
    from: range.from,
    to: range.to,
    group: range.group,
  };
  const sales = useSalesAnalytics(filters);
  const payments = usePaymentDistribution(filters);
  const data = sales.data;
  const hasSalesData = Boolean(
    data?.trend.some(
      (row) => row.revenue || row.discount || row.orders || row.grossProfit || row.returnValue
    )
  );
  if (!storeId)
    return (
      <div className={styles.page}>
        <Alert showIcon type="info" title="Choose a store to load Sales Analytics." />
      </div>
    );
  return (
    <main className={`${styles.page} ${styles.salesPage}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Sales · Analytics</span>
          <h1>Sales Analytics</h1>
          <p>Revenue, orders, discounts, returns and payment collection for {storeName}.</p>
        </div>
        <div className={styles.controls}>
          <AnalyticsDateFilter range={range} onPreset={selectPreset} onCustom={selectCustom} />
          <Button
            aria-label="Refresh sales analytics"
            icon={<ReloadOutlined />}
            onClick={() => {
              void sales.refetch();
              void payments.refetch();
            }}
            loading={sales.isFetching || payments.isFetching}
          >
            Refresh
          </Button>
        </div>
      </header>
      {sales.isError ? (
        <Alert
          className={styles.note}
          showIcon
          type="error"
          title="Sales analytics could not be loaded"
          description={sales.error.message}
          action={<Button onClick={() => sales.refetch()}>Try again</Button>}
        />
      ) : null}
      {data?.methodology.grossProfitNote ? (
        <Alert
          className={styles.note}
          showIcon
          type="warning"
          title="Profit data is incomplete"
          description={data.methodology.grossProfitNote}
        />
      ) : null}
      <section className={`${styles.metrics} ${styles.salesMetrics}`} aria-label="Sales metrics">
        {[
          {
            label: "Net Sales",
            value: data ? money(data.summary.revenue) : "—",
            helper: "After dated returns and exchanges",
            icon: <BarChartOutlined />,
            tone: styles.metricBlue,
          },
          {
            label: "Discounts",
            value: data ? money(data.summary.discounts) : "—",
            helper: "Sale and exchange discounts",
            icon: <TagsOutlined />,
            tone: styles.metricGreen,
          },
          {
            label: "Gross Profit",
            value: data
              ? data.summary.grossProfit == null
                ? "Unavailable"
                : money(data.summary.grossProfit)
              : "—",
            helper:
              data?.methodology.grossProfitReliable === false
                ? "Historical COGS incomplete"
                : "Net sales less reliable COGS",
            icon: <RiseOutlined />,
            tone: styles.metricPurple,
          },
          {
            label: "Transactions",
            value: data ? data.summary.orders.toLocaleString("en-IN") : "—",
            helper: "Original sale transactions",
            icon: <ShoppingOutlined />,
            tone: styles.metricOrange,
          },
        ].map(({ label, value, helper, icon, tone }) => (
          <article className={`${styles.metric} ${styles.salesMetric}`} key={label}>
            <div className={`${styles.metricIcon} ${tone}`} aria-hidden="true">
              {icon}
            </div>
            <div className={styles.metricCopy}>
              <span>{label}</span>
              {sales.isLoading ? <Skeleton.Input active size="small" /> : <strong>{value}</strong>}
              <small>{helper}</small>
            </div>
          </article>
        ))}
      </section>
      <div className={styles.grid}>
        <section className={`${styles.surface} ${styles.salesBreakdown}`}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2>Sales Breakdown</h2>
              <p>Net sales, discounts and reliable gross profit across the selected period.</p>
            </div>
            <span className={styles.groupBadge}>{groupLabel[range.group]}</span>
          </div>
          {sales.isLoading ? (
            <div className={styles.chartLoading}>
              <Skeleton active paragraph={{ rows: 7 }} />
            </div>
          ) : !hasSalesData ? (
            <div className={styles.emptyState}>
              <strong>No sales data for this period.</strong>
              <span>Try another date range.</span>
            </div>
          ) : (
            <figure
              className={styles.chartFigure}
              aria-label="Sales breakdown chart showing net sales, gross profit and discounts by period"
            >
              <div className={styles.salesChart}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                  initialDimension={{ width: 760, height: 320 }}
                >
                  <ComposedChart
                    data={data!.trend}
                    accessibilityLayer
                    margin={{ top: 12, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#e8eef6" vertical />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      minTickGap={22}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={72}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(value) => money(Number(value))}
                    />
                    <Tooltip content={<SalesTooltip />} cursor={{ fill: "#f7faff" }} />
                    <Legend
                      iconType="circle"
                      iconSize={9}
                      wrapperStyle={{ paddingTop: 14, fontSize: 12, color: "#52627a" }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Net sales"
                      fill="#1769ff"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={54}
                    />
                    <Line
                      connectNulls={false}
                      type="monotone"
                      dataKey="grossProfit"
                      name="Gross profit"
                      stroke="#08a647"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#08a647", stroke: "#ffffff", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "#08a647", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                    <Bar
                      dataKey="discount"
                      name="Discounts"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={34}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </figure>
          )}
        </section>
        <section className={`${styles.surface} ${styles.paymentSurface}`}>
          <div className={styles.surfaceHeader}>
            <div>
              <h2>Payment Method Distribution</h2>
              <p>Payments received by method; split payments contribute to each payment leg.</p>
            </div>
          </div>
          {payments.isError ? (
            <Alert
              showIcon
              type="error"
              title="Payment data could not be loaded"
              description={payments.error.message}
            />
          ) : (
            <SalesPaymentDistribution
              methods={payments.data?.methods}
              totalReceived={payments.data?.totalReceived}
              amountReceivable={payments.data?.amountReceivable}
              refundsPaid={payments.data?.refundsPaid}
              activeBucketLabel={`${dayjs(range.from).format("DD MMM")} – ${dayjs(range.to).format("DD MMM YYYY")}`}
              loading={payments.isLoading}
            />
          )}
        </section>
      </div>
    </main>
  );
}
