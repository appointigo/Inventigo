"use client";

import { Alert, Button, Empty, Skeleton } from "antd";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useStore } from "@/providers/StoreProvider";
import { useAnalyticsDateRange } from "../hooks/useAnalyticsDateRange";
import { useProfitabilityAnalytics } from "../hooks/useAnalytics";
import AnalyticsDateFilter from "./AnalyticsDateFilter";
import styles from "./AnalyticsPage.module.css";

const money = (value: number | null) => value === null || !Number.isFinite(value) ? "Unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function ProfitabilityPage() {
  const { storeId, storeName } = useStore();
  const { range, selectPreset, selectCustom } = useAnalyticsDateRange("30d");
  const query = useProfitabilityAnalytics({ storeId: storeId ?? undefined, from: range.from, to: range.to, group: range.group });
  const data = query.data;
  const hasActivity = data?.trend.some((row) => row.revenue || row.operatingExpenses);

  if (!storeId) return <div className={styles.page}><Alert showIcon type="info" title="Choose a store to load Profitability." /></div>;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Finance · Profitability</span><h1>Profitability</h1><p>Revenue, historical COGS and approved operating expenses for {storeName}.</p></div>
        <div className={styles.controls}><AnalyticsDateFilter range={range} onPreset={selectPreset} onCustom={selectCustom} /><Button onClick={() => query.refetch()} loading={query.isFetching}>Refresh</Button></div>
      </header>
      {query.isError ? <Alert className={styles.note} showIcon type="error" title="Profitability could not be loaded" description={query.error.message} action={<Button onClick={() => query.refetch()}>Try again</Button>} /> : null}
      {data?.methodology.grossProfitNote ? <Alert className={styles.note} showIcon type="warning" title="Historical COGS is incomplete" description={data.methodology.grossProfitNote} /> : null}
      <section className={`${styles.metrics} ${styles.profitMetrics}`} aria-label="Profitability metrics">
        {[
          ["Revenue", money(data?.summary.revenue ?? null), "Final billed sales net of dated returns"],
          ["Gross profit", money(data?.summary.grossProfit ?? null), data?.summary.grossMarginPct == null ? "Historical COGS unavailable" : `${data.summary.grossMarginPct}% gross margin`],
          ["Operating expenses", money(data?.summary.operatingExpenses ?? null), "Approved expenses in this store and period"],
          ["Net profit", money(data?.summary.netProfit ?? null), data?.summary.netMarginPct == null ? "Requires reliable COGS" : `${data.summary.netMarginPct}% net margin`],
          ["COGS", money(data?.summary.cogs ?? null), "Immutable SaleItem cost snapshots"],
          ["Break-even revenue", money(data?.summary.breakEvenRevenue ?? null), "COGS + operating expenses"],
        ].map(([label, value, helper]) => <article className={styles.metric} key={label}><span>{label}</span>{query.isLoading ? <Skeleton.Input active size="small" /> : <strong>{value}</strong>}<small>{helper}</small></article>)}
      </section>
      {!query.isLoading && data && !hasActivity ? <section className={styles.surface}><Empty description="No sales or approved expenses in this period" /></section> : null}
      {hasActivity ? <>
        <section className={styles.surface}><h2>Revenue vs Gross Profit</h2><p>Revenue compared with gross profit calculated from immutable sale-time costs.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 900, height: 310 }}><BarChart data={data!.trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={22} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(value) => money(Number(value))} /><Tooltip formatter={(value, name) => [money(value == null ? null : Number(value)), name]} /><Legend /><Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="grossProfit" name="Gross profit" fill="#16a34a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
        <div className={styles.halfGrid}>
          <section className={styles.surface}><h2>Gross Profit vs Operating Expenses</h2><p>Approved operating costs against profit before those expenses.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 520, height: 310 }}><BarChart data={data!.trend}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={20} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => money(Number(value))} /><Tooltip formatter={(value, name) => [money(value == null ? null : Number(value)), name]} /><Legend /><Bar dataKey="grossProfit" name="Gross profit" fill="#16a34a" radius={[4, 4, 0, 0]} /><Bar dataKey="operatingExpenses" name="Operating expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
          <section className={styles.surface}><h2>Net Profit Trend</h2><p>Gross profit less approved operating expenses.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 520, height: 310 }}><AreaChart data={data!.trend}><defs><linearGradient id="netProfitFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={.22} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={20} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => money(Number(value))} /><ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" /><Tooltip formatter={(value) => [money(value == null ? null : Number(value)), "Net profit"]} /><Area connectNulls={false} type="monotone" dataKey="netProfit" stroke="#16a34a" strokeWidth={2.4} fill="url(#netProfitFill)" /></AreaChart></ResponsiveContainer></div></section>
        </div>
      </> : query.isLoading ? <section className={styles.surface}><Skeleton active paragraph={{ rows: 10 }} /></section> : null}
    </main>
  );
}
