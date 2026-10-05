"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { Alert, Button, Empty, Skeleton, Tag, Typography } from "antd";
import {
  ArrowRightOutlined,
  DollarOutlined,
  InboxOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useExpenseAnalytics } from "@/modules/dashboard/hooks/useExpenseAnalytics";
import { calculateProfitabilityMetrics } from "@/modules/dashboard/services/profitabilityService";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { useDemandIntelligence } from "@/modules/demand-intelligence/hooks/useDemandIntelligence";
import { useInventoryIntelligence } from "@/modules/inventory-intelligence/hooks/useInventoryIntelligence";
import { useStore } from "@/providers/StoreProvider";
import { formatDateTime } from "@/shared/utils/formatDate";
import styles from "./dashboard.module.css";

const { Text, Title } = Typography;
const subscribeToHydration = () => () => undefined;

type SalesTrendRow = {
  period: string;
  total_revenue: number;
  total_discount: number;
  net_profit: number | null;
  transaction_count?: number;
};

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
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [trend, setTrend] = useState<SalesTrendRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const end = dayjs().endOf("day");
  const start = end.subtract(29, "day").startOf("day");
  const startDate = start.format("YYYY-MM-DD");
  const endDate = end.format("YYYY-MM-DD");

  const { data, loading, error } = useDashboard(storeId ?? undefined);
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts(storeId ?? undefined);
  const { sales, loading: salesLoading, setFilters, setLimit } = useSales({ startDate, endDate });
  const { data: expenses, loading: expensesLoading } = useExpenseAnalytics(storeId, "monthly", startDate, endDate);
  const inventory = useInventoryIntelligence({ storeId: storeId ?? undefined, period: "monthly", comparisonMode: "previousPeriod" });
  const demand = useDemandIntelligence(storeId ?? undefined, start.toISOString(), end.toISOString());

  useEffect(() => {
    setLimit(100);
    setFilters({ startDate, endDate });
  }, [endDate, setFilters, setLimit, startDate]);

  useEffect(() => {
    const controller = new AbortController();
    if (!storeId) {
      const timeout = window.setTimeout(() => {
        setTrend([]);
        setTrendLoading(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    const loadingTimeout = window.setTimeout(() => setTrendLoading(true), 0);
    const params = new URLSearchParams({ group: "day", from: startDate, to: endDate, storeId });
    fetch(`/api/reports/sales-breakdown-v2?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) {
          setTrend([]);
          return;
        }
        setTrend(rows.flatMap((row): SalesTrendRow[] => {
          if (!row || typeof row !== "object") return [];
          const value = row as Partial<SalesTrendRow>;
          if (typeof value.period !== "string" || !dayjs(value.period).isValid()) return [];
          return [{
            period: value.period,
            total_revenue: finiteNumber(value.total_revenue),
            total_discount: finiteNumber(value.total_discount),
            net_profit: value.net_profit == null ? null : finiteNumber(value.net_profit),
            transaction_count: finiteNumber(value.transaction_count),
          }];
        }));
      })
      .catch((requestError) => { if (requestError instanceof Error && requestError.name !== "AbortError") setTrend([]); })
      .finally(() => setTrendLoading(false));
    return () => {
      window.clearTimeout(loadingTimeout);
      controller.abort();
    };
  }, [endDate, startDate, storeId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: "1", pageSize: "1" });
    if (storeId) params.set("storeId", storeId);
    fetch(`/api/customers?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setCustomerCount(typeof payload?.total === "number" ? payload.total : null))
      .catch(() => setCustomerCount(null));
    return () => controller.abort();
  }, [storeId]);

  const summary = useMemo(() => {
    const revenue = trend.reduce((sum, row) => sum + finiteNumber(row.total_revenue), 0);
    const grossProfitReliable = trend.every((row) => row.net_profit !== null);
    const grossProfit = trend.reduce((sum, row) => sum + finiteNumber(row.net_profit), 0);
    const orders = trend.reduce((sum, row) => sum + finiteNumber(row.transaction_count), 0);
    const operatingExpenses = finiteNumber(expenses?.summary?.totalExpense);
    return { orders, grossProfitReliable, ...calculateProfitabilityMetrics({ revenue, grossProfit, operatingExpenses }) };
  }, [expenses?.summary?.totalExpense, trend]);

  const revenueComparison = useMemo(() => {
    const midpoint = Math.floor(trend.length / 2);
    const previous = trend.slice(0, midpoint).reduce((sum, row) => sum + finiteNumber(row.total_revenue), 0);
    const current = trend.slice(midpoint).reduce((sum, row) => sum + finiteNumber(row.total_revenue), 0);
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [trend]);

  const chartData = trend.map((row) => ({
    label: dayjs(row.period).format("DD MMM"),
    revenue: finiteNumber(row.total_revenue),
    grossProfit: row.net_profit,
  }));

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
    ...(alerts.length ? [{ key: "low-stock", tone: "warning", title: `${alerts.length} items need stock attention`, detail: `${stockSummary.outOfStock} out of stock`, path: "/dashboard/stock" }] : []),
    ...(finiteNumber(data?.kpis?.pendingPOsCount) > 0 ? [{ key: "purchase-orders", tone: "info", title: `${finiteNumber(data?.kpis?.pendingPOsCount)} purchase orders are open`, detail: "Review supplier progress", path: "/dashboard/purchase-orders" }] : []),
    ...(highDemandLowStock.length > 0 ? [{ key: "replenishment", tone: "warning", title: `${highDemandLowStock.length} high-demand items risk stocking out`, detail: "Review replenishment suggestions", path: "/dashboard/inventory-intelligence" }] : []),
    ...(finiteNumber(demand.data?.demand?.unfulfilledQuantity) > 0 ? [{ key: "demand", tone: "info", title: `${finiteNumber(demand.data?.demand?.unfulfilledQuantity)} requested units were unavailable`, detail: "Investigate lost demand", path: "/dashboard/demand" }] : []),
  ];

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const dashboardLoading = loading || trendLoading || expensesLoading;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Text className={styles.eyebrow}>{storeName || "Business overview"}</Text>
          <Title level={1}>Good {dayjs().hour() < 12 ? "morning" : dayjs().hour() < 17 ? "afternoon" : "evening"}, {firstName}</Title>
          <Text type="secondary">Here&apos;s what&apos;s happening with your business right now.</Text>
        </div>
        <div className={styles.periodPill}>Last 30 days · {start.format("DD MMM")}–{end.format("DD MMM YYYY")}</div>
      </header>

      {error ? <Alert type="error" showIcon message="Some dashboard data could not be loaded" description={error} /> : null}

      <section className={styles.metricGrid} aria-label="Business performance summary">
        {[
          { label: "Net sales", value: currency(summary.revenue), helper: `${revenueComparison >= 0 ? "+" : ""}${revenueComparison}% vs prior 15 days`, icon: DollarOutlined, tone: "blue" },
          { label: "Net profit", value: summary.grossProfitReliable ? currency(summary.netProfit) : "Unavailable", helper: summary.grossProfitReliable ? `${summary.netProfitMarginPct}% margin after expenses` : "Historical exchange cost is incomplete", icon: RiseOutlined, tone: summary.netProfit >= 0 ? "green" : "red" },
          { label: "Orders", value: summary.orders.toLocaleString("en-IN"), helper: "Completed transactions", icon: ShoppingCartOutlined, tone: "violet" },
          { label: "Customers", value: customerCount == null ? "—" : customerCount.toLocaleString("en-IN"), helper: "Customer relationships", icon: TeamOutlined, tone: "slate" },
          { label: "Low stock", value: String(finiteNumber(data?.kpis?.lowStockCount)), helper: alerts.length ? "Action recommended" : "Inventory healthy", icon: WarningOutlined, tone: "amber" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={styles.metricCard} data-tone={metric.tone}>
              <div className={styles.metricTop}><span>{metric.label}</span><span className={styles.metricIcon}><Icon /></span></div>
              {dashboardLoading ? <Skeleton.Input active size="small" /> : <strong>{metric.value}</strong>}
              <small>{metric.helper}</small>
            </article>
          );
        })}
      </section>

      <div className={styles.primaryGrid}>
        <DashboardSection title="Sales performance" description="Revenue and gross profit trend across the last 30 days" action={{ label: "View Sales Analytics", onClick: () => router.push("/dashboard/sales/analytics") }} className={styles.salesSection}>
          {trendLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : chartData.length === 0 ? <Empty description="No sales yet in this period" /> : (
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
        <DashboardSection title="Inventory health" description="Current inventory position" action={{ label: "View inventory intelligence", onClick: () => router.push("/dashboard/inventory-intelligence") }}>
          <div className={styles.inventoryValue}><span>Total inventory value</span><strong>{currency(finiteNumber(data?.kpis?.totalStockValue))}</strong></div>
          <div className={styles.healthGrid}>
            {[{ label: "Products", value: finiteNumber(data?.kpis?.totalProducts) }, { label: "Low stock", value: stockSummary.lowStock }, { label: "Out of stock", value: stockSummary.outOfStock }, { label: "Slow / dead", value: stockSummary.slowMoving + stockSummary.deadStock }].map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
        </DashboardSection>

        <DashboardSection title="Profitability snapshot" description="Last 30 days" action={{ label: "View Profitability", onClick: () => router.push("/dashboard/expenses/profitability") }}>
          <div className={styles.healthGrid}>
            {[
              { label: "Revenue", value: currency(summary.revenue) },
              { label: "Gross profit", value: summary.grossProfitReliable ? currency(summary.grossProfit) : "—" },
              { label: "Expenses", value: currency(summary.operatingExpenses) },
              { label: "Net profit", value: summary.grossProfitReliable ? currency(summary.netProfit) : "—" },
            ].map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
          {!summary.grossProfitReliable ? <p className={styles.insightNote}><WarningOutlined /> Profit is unavailable because some exchange lines lack historical cost.</p> : null}
        </DashboardSection>

        <DashboardSection title="Demand insight" description={demand.data?.evidenceNote || "Customer demand signals"} action={{ label: "View demand intelligence", onClick: () => router.push("/dashboard/demand") }}>
          {demand.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : !demand.data || demand.data.evidence === "none" ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Demand intelligence will appear once enough customer activity is recorded" /> : (
            <>
              <div className={styles.demandHeadline}><span>Observed demand</span><strong>{finiteNumber(demand.data.demand?.observedDemand)}</strong><Tag color={demand.data.evidence === "reliable" ? "green" : "gold"}>{demand.data.evidence} evidence</Tag></div>
              <div className={styles.demandStats}><div><strong>{demand.data.demand?.fulfillmentRate == null ? "—" : `${finiteNumber(demand.data.demand.fulfillmentRate)}%`}</strong><span>Fulfilled</span></div><div><strong>{finiteNumber(demand.data.demand?.unfulfilledQuantity)}</strong><span>Units missed</span></div><div><strong>{demand.data.visits?.conversionRate == null ? "—" : `${finiteNumber(demand.data.visits.conversionRate)}%`}</strong><span>Conversion</span></div></div>
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
