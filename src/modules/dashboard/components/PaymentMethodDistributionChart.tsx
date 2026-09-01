"use client";

import { useMemo } from "react";
import { Empty } from "antd";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PieLabelRenderProps, TooltipContentProps } from "recharts";
import type { PaymentMethodDistribution } from "@/modules/dashboard/services/paymentMethodService";

interface PaymentMethodDistributionChartProps {
  distributionData?: PaymentMethodDistribution[];
  amountReceivable?: number;
  activeBucketLabel?: string;
  loading?: boolean;
  height?: number;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: "#1abc9c",
  Card: "#3b82f6",
  UPI: "#f59e0b",
  Split: "#a855f7",
};

const DEFAULT_COLOR_SEQUENCE = Object.values(PAYMENT_METHOD_COLORS);

export default function PaymentMethodDistributionChart({
  distributionData: distributionDataProp,
  amountReceivable = 0,
  activeBucketLabel,
  loading = false,
  height = 300,
}: PaymentMethodDistributionChartProps) {
  const distributionData = useMemo(
    () => distributionDataProp ?? [],
    [distributionDataProp],
  );

  const paymentDistributionTotal = useMemo(() => {
    return distributionData.reduce((sum, entry) => sum + entry.value, 0);
  }, [distributionData]);

  const chartData = useMemo(
    () =>
      distributionData.map((item) => ({
        ...item,
        displayName: `${item.name} ${item.percentage}%`,
      })),
    [distributionData]
  );

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const payload = (props.payload ?? props) as Partial<PaymentMethodDistribution>;
    const percentage = payload?.percentage ?? (typeof props?.percent === "number" ? Math.round(props.percent * 100) : 0);
    const x = typeof props?.x === "number" ? props.x : 0;
    const y = typeof props?.y === "number" ? props.y : 0;

    if (Number(payload?.value ?? 0) === 0) return null;

    return (
      <text x={x} y={y} fill="#ffffff" fontSize={12} fontWeight={600} textAnchor="middle">
        {`${percentage}%`}
      </text>
    );
  };

  const renderCustomTooltip = ({ active, payload }: TooltipContentProps) => {
    const data = payload?.[0]?.payload as PaymentMethodDistribution | undefined;
    if (!active || !data) return null;

    const { name, value, percentage, count } = data;

    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "10px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {activeBucketLabel ? (
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
            {activeBucketLabel}
          </div>
        ) : null}
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
          Amount: ₹
          {value.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
          Coverage: {percentage}% of chart total
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Percentage: {percentage}%</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Count: {count ?? 0}</div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {loading ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#9ca3af" }}>Loading...</div>
        </div>
      ) : distributionData.length === 0 && amountReceivable === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No payment data available for this period"
          />
        </div>
      ) : (
        <div style={{ width: "100%" }}>
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        PAYMENT_METHOD_COLORS[entry.name] ??
                        DEFAULT_COLOR_SEQUENCE[index % DEFAULT_COLOR_SEQUENCE.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={renderCustomTooltip} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const data = entry.payload as PaymentMethodDistribution & {
                      displayName?: string;
                    };

                    return (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {data.name}: {data.value.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #e5e7eb",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 16,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                Total Received
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
                ₹
                {paymentDistributionTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                Amount Receivable
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#d97706" }}>
                ₹
                {amountReceivable.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
