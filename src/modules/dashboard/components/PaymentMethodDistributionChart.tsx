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
import type { PieLabelRenderProps } from "recharts";
import type { SaleSummary } from "@/modules/billing/types";
import type { PaymentMethodDistribution } from "@/modules/dashboard/services/paymentMethodService";

interface PaymentMethodDistributionChartProps {
  sales: SaleSummary[];
  loading?: boolean;
  height?: number;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: "#1abc9c",
  Card: "#3b82f6",
  UPI: "#f59e0b",
};

const DEFAULT_COLOR_SEQUENCE = Object.values(PAYMENT_METHOD_COLORS);

export default function PaymentMethodDistributionChart({
  sales,
  loading = false,
  height = 300,
}: PaymentMethodDistributionChartProps) {

  const distributionData = useMemo<PaymentMethodDistribution[]>(() => {
    const methodTotals: Record<string, number> = {};

    sales.forEach((sale) => {
      if (sale.status === "COMPLETED") {
        const amount = Number(sale.total) || 0;
        methodTotals[sale.paymentMethod] = (methodTotals[sale.paymentMethod] ?? 0) + amount;
      }
    });

    const overallTotal = Object.values(methodTotals).reduce((sum, value) => sum + value, 0);
    if (overallTotal === 0) return [];

    const methodLabels: Record<string, string> = {
      CASH: "Cash",
      CARD: "Card",
      UPI: "UPI",
    };

    return Object.entries(methodTotals)
      .map(([method, total]) => ({
        name: methodLabels[method] ?? method,
        value: Number(total.toFixed(2)),
        percentage: Number(((total / overallTotal) * 100).toFixed(2)),
      }))
      .sort((left, right) => right.value - left.value);
  }, [sales]);

  const totalRevenue = useMemo(() => {
    return sales
      .filter((sale) => sale.status === "COMPLETED")
      .reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
  }, [sales]);

  const completedSalesCount = useMemo(() => {
    return sales.filter((sale) => sale.status === "COMPLETED").length;
  }, [sales]);

  const chartData = useMemo(
    () =>
      distributionData.map((item) => ({
        ...item,
        displayName: `${item.name} ${item.percentage}%`,
      })),
    [distributionData]
  );

  const renderCustomLabel = (props: PieLabelRenderProps | any) => {
    const payload = (props && (props.payload ?? props)) as any;
    const percentage = payload?.percentage ?? (typeof props?.percent === "number" ? Math.round(props.percent * 100) : 0);
    const x = typeof props?.x === "number" ? props.x : 0;
    const y = typeof props?.y === "number" ? props.y : 0;

    return (
      <text x={x} y={y} fill="#ffffff" fontSize={12} fontWeight={600} textAnchor="middle">
        {`${percentage}%`}
      </text>
    );
  };

  const renderCustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: PaymentMethodDistribution }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;

    const { name, value, percentage } = payload[0].payload;

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
        <div style={{ fontSize: 12, color: "#6b7280" }}>Percentage: {percentage}%</div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {loading ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#9ca3af" }}>Loading...</div>
        </div>
      ) : distributionData.length === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No completed sales data available"
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
                <Tooltip content={renderCustomTooltip as any} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const data = entry.payload as PaymentMethodDistribution & {
                      displayName?: string;
                    };

                    return <span style={{ fontSize: 12, color: "#6b7280" }}>{data.name}</span>;
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                Total Revenue
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
                ₹
                {totalRevenue.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                Completed Sales
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
                {completedSalesCount}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                Payment Methods
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
                {distributionData.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
