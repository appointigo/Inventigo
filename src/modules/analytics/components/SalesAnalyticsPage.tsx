"use client";

import { Alert, Button, Empty, Skeleton } from "antd";
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
import PaymentMethodDistributionChart from "@/modules/dashboard/components/PaymentMethodDistributionChart";
import { useStore } from "@/providers/StoreProvider";
import { useAnalyticsDateRange } from "../hooks/useAnalyticsDateRange";
import { usePaymentDistribution, useSalesAnalytics } from "../hooks/useAnalytics";
import AnalyticsDateFilter from "./AnalyticsDateFilter";
import styles from "./AnalyticsPage.module.css";

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

export default function SalesAnalyticsPage() {
  const { storeId, storeName } = useStore();
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("30d");
  const filters = {
    storeId: storeId ?? undefined,
    from: range.from,
    to: range.to,
    group: range.group,
  };
  const sales = useSalesAnalytics(filters);
  const payments = usePaymentDistribution(filters);
  const data = sales.data;
  if (!storeId) return <div className={styles.page}><Alert showIcon type="info" title="Choose a store to load Sales Analytics." /></div>;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Sales · Analytics</span><h1>Sales Analytics</h1><p>Revenue, orders, discounts, returns and payment collection for {storeName}.</p></div>
        <div className={styles.controls}>
          <AnalyticsDateFilter range={range} onPreset={selectPreset} onCustom={selectCustom} />
          <Button onClick={() => { void sales.refetch(); void payments.refetch(); }} loading={sales.isFetching || payments.isFetching}>Refresh</Button>
        </div>
      </header>
      {sales.isError ? <Alert className={styles.note} showIcon type="error" title="Sales analytics could not be loaded" description={sales.error.message} action={<Button onClick={() => sales.refetch()}>Try again</Button>} /> : null}
      {data?.methodology.grossProfitNote ? <Alert className={styles.note} showIcon type="warning" title="Profit data is incomplete" description={data.methodology.grossProfitNote} /> : null}
      <section className={styles.metrics} aria-label="Sales metrics">
        {[
          ["Net sales", data ? money(data.summary.revenue) : "—", "After dated returns and exchanges"],
          ["Orders", data ? data.summary.orders.toLocaleString("en-IN") : "—", "Original sale transactions"],
          ["Average order value", data ? money(data.summary.averageOrderValue) : "—", "Net sales ÷ orders"],
          ["Discounts", data ? money(data.summary.discounts) : "—", "Recorded sale and exchange discounts"],
          ["Returns", data ? money(data.summary.returnValue) : "—", `${data?.summary.returns ?? 0} returns · ${data?.summary.exchanges ?? 0} exchanges`],
        ].map(([label, value, helper]) => <article className={styles.metric} key={label}><span>{label}</span>{sales.isLoading ? <Skeleton.Input active size="small" /> : <strong>{value}</strong>}<small>{helper}</small></article>)}
      </section>
      <div className={styles.grid}>
        <section className={styles.surface}><h2>Sales Breakdown</h2><p>Net sales, discounts and reliable gross profit across the selected period.</p>
          {sales.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : !data?.trend.some((row) => row.revenue || row.discount || row.orders) ? <Empty description="No sales activity in this period" /> : <div className={styles.chart}><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 720, height: 310 }}><ComposedChart data={data.trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={22} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(value) => money(Number(value))} /><Tooltip formatter={(value, name) => [money(Number(value ?? 0)), name]} /><Legend /><Bar dataKey="revenue" name="Net sales" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="discount" name="Discounts" fill="#f59e0b" radius={[4, 4, 0, 0]} /><Line connectNulls={false} type="monotone" dataKey="grossProfit" name="Gross profit" stroke="#16a34a" strokeWidth={2.4} dot={false} /></ComposedChart></ResponsiveContainer></div>}
        </section>
        <section className={styles.surface}><h2>Payment Method Distribution</h2><p>Payments received by method; split payments contribute to each payment leg.</p>
          {payments.isError ? <Alert showIcon type="error" title="Payment data could not be loaded" description={payments.error.message} /> : <PaymentMethodDistributionChart distributionData={payments.data?.methods} amountReceivable={payments.data?.amountReceivable} activeBucketLabel={`${dayjs(range.from).format("DD MMM")} – ${dayjs(range.to).format("DD MMM YYYY")}`} loading={payments.isLoading} height={310} />}
        </section>
      </div>
    </main>
  );
}
