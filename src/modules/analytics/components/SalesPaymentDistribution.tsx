"use client";

import { Skeleton } from "antd";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentMethodDistribution } from "@/modules/dashboard/services/paymentMethodService";
import styles from "./AnalyticsPage.module.css";

const METHOD_COLORS: Record<string, string> = {
  Cash: "#08a647",
  UPI: "#f5a000",
  Card: "#1769ff",
};

const FALLBACK_COLORS = ["#7c3aed", "#0891b2", "#db2777", "#65a30d", "#ea580c"];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

function colorFor(method: string, index: number) {
  return METHOD_COLORS[method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function PaymentTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  const method = payload?.[0]?.payload as PaymentMethodDistribution | undefined;
  if (!active || !method) return null;

  return (
    <div className={styles.paymentTooltip}>
      <strong>{method.name}</strong>
      <span>{money(method.value)}</span>
      <small>
        {method.percentage}% · {method.count.toLocaleString("en-IN")} payment entries
      </small>
    </div>
  );
}

export default function SalesPaymentDistribution({
  methods = [],
  totalReceived = 0,
  refundsPaid = 0,
  amountReceivable = 0,
  activeBucketLabel,
  loading = false,
}: {
  methods?: PaymentMethodDistribution[];
  totalReceived?: number;
  refundsPaid?: number;
  amountReceivable?: number;
  activeBucketLabel: string;
  loading?: boolean;
}) {
  const chartMethods = methods.filter((method) => method.value > 0);

  if (loading) {
    return (
      <div className={styles.paymentLoading}>
        <Skeleton active paragraph={{ rows: 7 }} />
      </div>
    );
  }

  if (chartMethods.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>No payments received during this period.</strong>
      </div>
    );
  }

  return (
    <div className={styles.paymentContent}>
      <figure
        className={styles.donutFigure}
        aria-label={`Payment method distribution for ${activeBucketLabel}`}
      >
        <div className={styles.donutChart}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={{ width: 280, height: 190 }}
          >
            <PieChart accessibilityLayer>
              <Pie
                data={chartMethods}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="57%"
                outerRadius="82%"
                paddingAngle={1}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chartMethods.map((method, index) => (
                  <Cell key={method.name} fill={colorFor(method.name, index)} />
                ))}
              </Pie>
              <Tooltip content={<PaymentTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.donutCenter} aria-hidden="true">
            <strong>{money(totalReceived)}</strong>
            <span>Total Received</span>
          </div>
        </div>
      </figure>

      <div className={styles.paymentLegend} aria-label="Payment methods">
        {chartMethods.map((method, index) => (
          <div className={styles.paymentLegendRow} key={method.name}>
            <span className={styles.paymentMethod}>
              <i style={{ backgroundColor: colorFor(method.name, index) }} aria-hidden="true" />
              <span>{method.name}</span>
            </span>
            <strong>{money(method.value)}</strong>
            <span>{method.percentage}%</span>
          </div>
        ))}
      </div>

      <div className={styles.paymentSummary}>
        <div>
          <span>Total Received</span>
          <strong>{money(totalReceived)}</strong>
        </div>
        <div>
          <span>Refunds Paid</span>
          <strong className={styles.refunds}>{money(refundsPaid)}</strong>
        </div>
        <div>
          <span>Amount Receivable</span>
          <strong className={styles.receivable}>{money(amountReceivable)}</strong>
        </div>
      </div>
    </div>
  );
}
