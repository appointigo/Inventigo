"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { Alert, Button, Empty, Skeleton, Tag, Typography } from "antd";
import {
  ArrowRightOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AnalyticsDateFilter, { type AnalyticsDateFilterOption } from "@/modules/analytics/components/AnalyticsDateFilter";
import { useProfitabilityAnalytics } from "@/modules/analytics/hooks/useAnalytics";
import { useAnalyticsDateRange } from "@/modules/analytics/hooks/useAnalyticsDateRange";
import { businessDateEndExclusive, businessDateStart, type AnalyticsDatePreset } from "@/modules/analytics/utils/dateRange";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { useDemandIntelligence } from "@/modules/demand-intelligence/hooks/useDemandIntelligence";
import { useInventoryIntelligence } from "@/modules/inventory-intelligence/hooks/useInventoryIntelligence";
import { useStore } from "@/providers/StoreProvider";
import { formatDateTime } from "@/shared/utils/formatDate";
import styles from "./dashboard.module.css";

const { Text, Title } = Typography;
const subscribeToHydration = () => () => undefined;

const currency = (value: number, compact = false) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  ...(compact ? { notation: "compact" as const } : {}),
}).format(Number.isFinite(value) ? value : 0);

const finiteNumber = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const PERIOD_LABELS: Record<AnalyticsDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  lastWeek: "Last Week",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisQuarter: "This Quarter",
  lastQuarter: "Last Quarter",
  thisYear: "This Year",
  lastYear: "Last Year",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "12m": "Last 12 Months",
  custom: "Custom",
};

const DASHBOARD_PRESETS = ["today", "thisWeek", "thisMonth", "thisQuarter", "thisYear", "custom"] as const;

const DASHBOARD_DATE_OPTIONS: AnalyticsDateFilterOption[] = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const dateRangeLabel = (from: string, to: string) => {
  if (from === to) return dayjs(from).format("DD MMM YYYY");
  const start = dayjs(from);
  const end = dayjs(to);
  return start.year() === end.year()
    ? `${start.format("DD MMM")}–${end.format("DD MMM YYYY")}`
    : `${start.format("DD MMM YYYY")}–${end.format("DD MMM YYYY")}`;
};

function DashboardSection({ title, description, action, children, className = "" }: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.section} ${className}`}>
      <header className={styles.sectionHeader}>
        <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        {action ? <Button type="link" onClick={action.onClick}>{action.label} <ArrowRightOutlined /></Button> : null}
      </header>
      {children}
    </section>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { storeId, storeName } = useStore();
  const [releaseActions, setReleaseActions] = useState<{ customerActions: number; receivables: number } | null>(null);
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("thisMonth", DASHBOARD_PRESETS);
  const startDate = range.from;
  const endDate = range.to;
  const periodLabel = `${PERIOD_LABELS[range.preset]} · ${dateRangeLabel(range.from, range.to)}`;

  const { data, loading, error } = useDashboard(storeId ?? undefined);
  const profitability = useProfitabilityAnalytics({
    storeId: storeId ?? undefined,
    period: range.preset,
    from: range.from,
    to: range.to,
    group: range.group,
  });
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts(storeId ?? undefined);
  const { sales, loading: salesLoading, setFilters, setLimit } = useSales({ startDate, endDate });
  const inventory = useInventoryIntelligence({ storeId: storeId ?? undefined, period: "monthly", comparisonMode: "previousPeriod" });
  const demand = useDemandIntelligence(
    storeId ?? undefined,
    businessDateStart(range.from).toISOString(),
    businessDateEndExclusive(range.to).toISOString(),
  );

  useEffect(() => {
    setLimit(100);
    setFilters({ startDate, endDate });
  }, [endDate, setFilters, setLimit, startDate]);

  useEffect(() => {
    const controller = new AbortController();
    if (!storeId) return () => controller.abort();
    const params = new URLSearchParams({ storeId, period: "monthly", compare: "previousPeriod", page: "1", pageSize: "1" });
    Promise.all([
      fetch(`/api/customer-actions?${params}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch(`/api/receivables?${params}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null),
    ]).then(([customers, receivables]) => setReleaseActions({
      customerActions: Number(customers?.counts?.OVERDUE_FOLLOW_UP ?? 0) + Number(customers?.counts?.HIGH_VALUE_DORMANT ?? 0) + Number(customers?.counts?.DEMAND_FOLLOW_UP ?? 0),
      receivables: Number(receivables?.kpis?.totalOutstanding ?? 0),
    })).catch((requestError) => { if (requestError instanceof Error && requestError.name !== "AbortError") setReleaseActions(null); });
    return () => controller.abort();
  }, [storeId]);

  const summary = profitability.data?.summary;
  const chartData = profitability.data?.trend ?? [];

  const alerts = useMemo(() => Array.isArray(lowStockItems) ? lowStockItems : [], [lowStockItems]);
  const inventoryOverstock = useMemo(() => Array.isArray(inventory.data?.overstock) ? inventory.data.overstock : [], [inventory.data]);
  const highDemandLowStock = Array.isArray(inventory.data?.highDemandLowStock) ? inventory.data.highDemandLowStock : [];
  const recentMovements = useMemo(() => Array.isArray(data?.recentMovements) ? data.recentMovements : [], [data]);
  const recentSales = Array.isArray(sales) ? sales : [];
  const stockSummary = useMemo(() => ({
    outOfStock: alerts.filter((item) => finiteNumber(item.quantity) <= 0).length,
    lowStock: alerts.filter((item) => finiteNumber(item.quantity) > 0).length,
    slowMoving: inventoryOverstock.filter((item) => item.status === "Slow moving").length,
    deadStock: inventoryOverstock.filter((item) => item.status === "Dead stock candidate").length,
  }), [alerts, inventoryOverstock]);

  const topProducts = useMemo(() => {
    const totals = new Map<string, { product: string; sku: string; quantity: number }>();
    for (const movement of recentMovements) {
      if (movement.type !== "SALE") continue;
      const sku = movement.sku || "No SKU";
      const existing = totals.get(sku) ?? { product: movement.productName || "Unnamed product", sku, quantity: 0 };
      existing.quantity += Math.abs(finiteNumber(movement.quantity));
      totals.set(sku, existing);
    }
    return [...totals.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5);
  }, [recentMovements]);

  const attentionItems = [
    ...((highDemandLowStock.length > 0 || alerts.length > 0) ? [{ key: "replenishment", tone: "warning", title: `${Math.max(highDemandLowStock.length, alerts.length)} products need attention`, detail: "Review product reorder decisions", path: "/dashboard/inventory-intelligence/products" }] : []),
    ...((releaseActions?.customerActions ?? 0) > 0 ? [{ key: "customer-actions", tone: "info", title: `${releaseActions!.customerActions} customers need follow-up`, detail: "Review today’s action queue", path: "/dashboard/customers/action-center" }] : []),
    ...(finiteNumber(demand.data?.demand?.unfulfilledQuantity) > 0 ? [{ key: "demand", tone: "info", title: `${finiteNumber(demand.data?.demand?.unfulfilledQuantity)} requested units were unavailable`, detail: "Investigate lost demand", path: "/dashboard/demand/lost-opportunity" }] : []),
    ...((releaseActions?.receivables ?? 0) > 0 ? [{ key: "receivables", tone: "warning", title: `${currency(releaseActions!.receivables)} outstanding`, detail: "Review receivable aging", path: "/dashboard/expenses/receivables" }] : []),
  ];

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const periodLoading = profitability.isLoading || profitability.isFetching;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Text className={styles.eyebrow}>{storeName || "Business overview"}</Text>
          <Title level={1}>Good {dayjs().hour() < 12 ? "morning" : dayjs().hour() < 17 ? "afternoon" : "evening"}, {firstName}</Title>
          <Text type="secondary">Here&apos;s what&apos;s happening with your business right now.</Text>
        </div>
        <div className={styles.periodControl}>
          <AnalyticsDateFilter
            range={range}
            onPreset={selectPreset}
            onCustom={selectCustom}
            options={DASHBOARD_DATE_OPTIONS}
          />
          <span>{periodLabel}</span>
        </div>
      </header>

      {error ? <Alert type="error" showIcon message="Some dashboard data could not be loaded" description={error} /> : null}
      {profitability.isError ? <Alert type="error" showIcon message="Dashboard analytics could not be loaded" description={profitability.error.message} action={<Button onClick={() => profitability.refetch()}>Try again</Button>} /> : null}

      <section className={styles.metricGrid} aria-label="Business performance summary">
        {[
          { label: "Net sales", value: summary ? currency(summary.revenue) : "—", helper: periodLabel, icon: DollarOutlined, tone: "blue", pending: periodLoading },
          { label: "Net profit", value: summary?.netProfit == null ? "Unavailable" : currency(summary.netProfit), helper: summary?.netMarginPct == null ? "Historical cost evidence is incomplete" : `${summary.netMarginPct}% margin after expenses`, icon: RiseOutlined, tone: (summary?.netProfit ?? 0) >= 0 ? "green" : "red", pending: periodLoading },
          { label: "Orders", value: summary ? summary.orders.toLocaleString("en-IN") : "—", helper: `${PERIOD_LABELS[range.preset]} · Completed transactions`, icon: ShoppingCartOutlined, tone: "violet", pending: periodLoading },
          { label: "Customers served", value: summary ? summary.customersServed.toLocaleString("en-IN") : "—", helper: "Unique identified purchasing customers", icon: TeamOutlined, tone: "slate", pending: periodLoading },
          { label: "Low stock", value: String(finiteNumber(data?.kpis?.lowStockCount)), helper: alerts.length ? "Current state · Action recommended" : "Current state · Inventory healthy", icon: WarningOutlined, tone: "amber", pending: loading },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={styles.metricCard} data-tone={metric.tone}>
              <div className={styles.metricTop}><span>{metric.label}</span><span className={styles.metricIcon}><Icon /></span></div>
              {metric.pending ? <Skeleton.Input active size="small" /> : <strong>{metric.value}</strong>}
              <small>{metric.helper}</small>
            </article>
          );
        })}
      </section>

      <div className={styles.primaryGrid}>
        <DashboardSection title="Sales performance" description={`${periodLabel} · ${range.group === "day" ? "Daily" : range.group === "week" ? "Weekly" : "Monthly"} grouping`} action={{ label: "View Sales Analytics", onClick: () => router.push(`/dashboard/sales/analytics?period=${range.preset}${range.preset === "custom" ? `&from=${range.from}&to=${range.to}` : ""}`) }} className={styles.salesSection}>
          {periodLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : chartData.length === 0 ? <Empty description="No sales yet in this period" /> : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 720, height: 290 }}>
                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                  <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid stroke="#edf1f5" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} minTickGap={28} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => currency(Number(value), true)} />
                  <Tooltip formatter={(value, name) => [currency(Number(value ?? 0)), name === "revenue" ? "Revenue" : "Gross profit"]} contentStyle={{ border: "1px solid #e5eaf0", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.4} fill="url(#salesFill)" dot={false} />
                  <Area type="monotone" dataKey="grossProfit" stroke="#16a34a" strokeWidth={2} fill="transparent" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Needs attention" description="The most important operational follow-ups">
          {lowStockLoading || inventory.isLoading || demand.isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : attentionItems.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing needs urgent attention" /> : (
            <div className={styles.attentionList}>{attentionItems.slice(0, 4).map((item) => (
              <button key={item.key} type="button" onClick={() => router.push(item.path)}>
                <span className={styles.attentionIcon} data-tone={item.tone}><WarningOutlined /></span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <ArrowRightOutlined />
              </button>
            ))}</div>
          )}
        </DashboardSection>
      </div>

      <div className={styles.insightGrid}>
        <DashboardSection title="Inventory health" description="Current state · Current inventory position" action={{ label: "View inventory intelligence", onClick: () => router.push("/dashboard/inventory-intelligence") }}>
          {loading || lowStockLoading || inventory.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <>
            <div className={styles.inventoryValuePanel}>
              <span className={styles.insightMetricIcon} data-tone="blue"><InboxOutlined /></span>
              <span><small>Total inventory value</small><strong>{currency(finiteNumber(data?.kpis?.totalStockValue))}</strong></span>
            </div>
            <div className={styles.inventoryMiniGrid}>
              {[
                { label: "Products", value: finiteNumber(data?.kpis?.totalProducts), icon: InboxOutlined, tone: "blue" },
                { label: "Low stock", value: stockSummary.lowStock, icon: WarningOutlined, tone: "amber" },
                { label: "Out of stock", value: stockSummary.outOfStock, icon: CloseCircleOutlined, tone: "red" },
                { label: "Slow / dead", value: stockSummary.slowMoving + stockSummary.deadStock, icon: ClockCircleOutlined, tone: "purple" },
              ].map((item) => {
                const Icon = item.icon;
                return <div className={styles.inventoryMiniCard} key={item.label}><span className={styles.insightMetricIcon} data-tone={item.tone}><Icon /></span><span><strong>{item.value}</strong><small>{item.label}</small></span></div>;
              })}
            </div>
          </>}
        </DashboardSection>

        <DashboardSection title="Profitability snapshot" description={periodLabel} action={{ label: "View Profitability", onClick: () => router.push(`/dashboard/expenses/profitability?period=${range.preset}${range.preset === "custom" ? `&from=${range.from}&to=${range.to}` : ""}`) }}>
          {periodLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <div className={styles.profitGrid}>
            {[
              { label: "Revenue", value: summary ? currency(summary.revenue) : "—", icon: RiseOutlined, tone: "green" },
              { label: "Gross profit", value: summary?.grossProfit == null ? "Unavailable" : currency(summary.grossProfit), icon: DollarOutlined, tone: "blue" },
              { label: "Expenses", value: summary ? currency(summary.operatingExpenses) : "—", icon: FileTextOutlined, tone: "red" },
              { label: "Net profit", value: summary?.netProfit == null ? "Unavailable" : currency(summary.netProfit), icon: RiseOutlined, tone: "purple" },
            ].map((item) => {
              const Icon = item.icon;
              return <div className={styles.profitTile} data-tone={item.tone} key={item.label}><span className={styles.insightMetricIcon} data-tone={item.tone}><Icon /></span><strong>{item.value}</strong><small>{item.label}</small></div>;
            })}
          </div>}
          {profitability.data && !profitability.data.methodology.grossProfitReliable ? <p className={styles.insightNote}><WarningOutlined /> Profit is unavailable because some exchange lines lack historical cost.</p> : null}
        </DashboardSection>

        <DashboardSection title="Demand insight" description={`${periodLabel} · ${demand.data?.evidenceNote || "Customer demand signals"}`} action={{ label: "View demand intelligence", onClick: () => router.push("/dashboard/demand") }}>
          {demand.isError ? <Alert type="error" showIcon message="Demand insight could not be loaded" /> : demand.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : !demand.data || demand.data.evidence === "none" ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Demand intelligence will appear once enough customer activity is recorded" /> : (
            <>
              <div className={styles.demandHeadline}><span>Observed demand</span><strong>{finiteNumber(demand.data.demand?.observedDemand)}</strong><Tag color={demand.data.evidence === "reliable" ? "green" : "gold"}>{demand.data.evidence} evidence</Tag></div>
              <div className={styles.demandStats}>
                {[
                  { label: "Fulfilled", value: demand.data.demand?.fulfillmentRate == null ? "—" : `${finiteNumber(demand.data.demand.fulfillmentRate)}%`, icon: ShoppingCartOutlined, tone: "blue" },
                  { label: "Units missed", value: finiteNumber(demand.data.demand?.unfulfilledQuantity), icon: CloseCircleOutlined, tone: "red" },
                  { label: "Conversion", value: demand.data.visits?.conversionRate == null ? "—" : `${finiteNumber(demand.data.visits.conversionRate)}%`, icon: BarChartOutlined, tone: "purple" },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div key={item.label}><span className={styles.insightMetricIcon} data-tone={item.tone}><Icon /></span><strong>{item.value}</strong><small>{item.label}</small></div>;
                })}
              </div>
              {Array.isArray(demand.data.requirements) && demand.data.requirements[0] ? <p className={styles.insightNote}><InboxOutlined /> Highest signal: <strong>{demand.data.requirements[0].requirement || "Unspecified demand"}</strong></p> : null}
            </>
          )}
        </DashboardSection>
      </div>

      <div className={styles.bottomGrid}>
        <DashboardSection title="Recent transactions" action={{ label: "View all transactions", onClick: () => router.push("/dashboard/billing?view=history") }}>
          {salesLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : recentSales.length === 0 ? <Empty description="No recent transactions" /> : (
            <div className={styles.tableScroll}><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead><tbody>{recentSales.slice(0, 6).map((sale) => <tr key={sale.id}><td><strong>{sale.invoiceNumber || "—"}</strong></td><td>{sale.customerName || "Walk-in customer"}</td><td>{sale.transactionDate && dayjs(sale.transactionDate).isValid() ? formatDateTime(sale.transactionDate) : "—"}</td><td>{finiteNumber(sale.itemCount)}</td><td><strong>{currency(finiteNumber(sale.total))}</strong></td><td><Tag color={sale.paymentStatus === "PAID" ? "green" : sale.paymentStatus === "PARTIAL" ? "gold" : "red"}>{sale.paymentStatus || "PENDING"}</Tag></td></tr>)}</tbody></table></div>
          )}
        </DashboardSection>

        <DashboardSection title="Top products" description="Based on recent sold-unit movements" action={{ label: "Open products", onClick: () => router.push("/dashboard/products") }}>
          {topProducts.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No product sales to rank yet" /> : <div className={styles.productList}>{topProducts.map((product, index) => <div key={product.sku}><span className={styles.rank}>{index + 1}</span><span><strong>{product.product}</strong><small>{product.sku}</small></span><b>{product.quantity} sold</b></div>)}</div>}
        </DashboardSection>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!hydrated) {
    return <main className={styles.page}><Skeleton active paragraph={{ rows: 14 }} /></main>;
  }
  return <DashboardContent />;
}
