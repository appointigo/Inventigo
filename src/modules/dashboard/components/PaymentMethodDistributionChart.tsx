"use client";

import { useMemo } from "react";
import { Card, Col, Empty, Row, Space, Spin, Typography } from "antd";
import { Legend, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { SaleSummary } from "@/modules/billing/types";
import type { PaymentMethodDistribution } from "@/modules/dashboard/services/paymentMethodService";

interface PaymentMethodDistributionChartProps {
  sales: SaleSummary[];
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
  sales,
  activeBucketLabel,
  loading = false,
  height = 300,
}: PaymentMethodDistributionChartProps) {

  const distributionData = useMemo<PaymentMethodDistribution[]>(() => {
    const methodTotals: Record<string, number> = {};
    const validMethods = ["CASH", "CARD", "UPI"];

    sales.forEach((sale) => {
      if (sale.status === "COMPLETED") {
        // Check if sale has individual payment entries
        const paymentEntries = (sale.payments ?? []).filter(
          (entry) => Number(entry.amount ?? 0) > 0
        );

        if (paymentEntries.length > 0) {
          // Use individual payment entries (split payment breakdown)
          paymentEntries.forEach((entry) => {
            if (validMethods.includes(entry.method)) {
              methodTotals[entry.method] =
                (methodTotals[entry.method] ?? 0) + Number(entry.amount ?? 0);
            }
          });
        } else {
          // Fallback to sale.paymentMethod only for legacy records with valid methods
          const method = sale.paymentMethod;
          const amount = Number(sale.total) || 0;
          if (validMethods.includes(method)) {
            methodTotals[method] = (methodTotals[method] ?? 0) + amount;
          } else if (method === "SPLIT") {
            // Preserve split payment sales that do not have detailed payment entries
            methodTotals[method] = (methodTotals[method] ?? 0) + amount;
          }
        }
      }
    });

    const overallTotal = Object.values(methodTotals).reduce((sum, value) => sum + value, 0);
    if (overallTotal === 0) return [];

    const methodLabels: Record<string, string> = {
      CASH: "Cash",
      CARD: "Card",
      UPI: "UPI",
      SPLIT: "Split",
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

  const paymentDistributionTotal = useMemo(() => {
    return distributionData.reduce((sum, entry) => sum + entry.value, 0);
  }, [distributionData]);

  const unallocatedRevenue = useMemo(() => {
    return Math.max(0, totalRevenue - paymentDistributionTotal);
  }, [paymentDistributionTotal, totalRevenue]);

  const completedSalesCount = useMemo(() => {
    return sales.filter((sale) => sale.status === "COMPLETED").length;
  }, [sales]);

  const chartData = useMemo(
    () =>
      distributionData.map((item) => ({
        ...item,
        displayName: `${item.name} ${item.percentage}%`,
        fill:
          PAYMENT_METHOD_COLORS[item.name] ??
          DEFAULT_COLOR_SEQUENCE[distributionData.findIndex((entry) => entry.name === item.name) % DEFAULT_COLOR_SEQUENCE.length],
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

  const renderCustomTooltip = ({ active, payload } : { active?: boolean; payload?: Array<{ payload?: PaymentMethodDistribution }>}) => {
    if (!active || !payload?.length || !payload[0].payload) return null;

    const { name, value, percentage } = payload[0].payload;

    return (
      <Card size="small" variant="borderless" style={{ padding: 12 }}>
        <Space orientation="vertical" size={2}>
          {activeBucketLabel ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {activeBucketLabel}
            </Typography.Text>
          ) : null}
          <Typography.Text strong style={{ fontSize: 12 }}>
            {name}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#6b7280" }}>
            Amount: ₹{value.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#6b7280" }}>
            Coverage: {percentage}% of chart total
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: "#6b7280" }}>
            Percentage: {percentage}%
          </Typography.Text>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {loading ? (
        <Spin
          description="Loading..."
          style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}
        />
      ) : distributionData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No completed sales data available"
            style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}
          />
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
                  shape={(props) => (
                    <Sector
                      {...props}
                      fill={props.payload?.fill ?? props.fill}
                    />
                  )}
                />
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

          <Row style={{ marginTop: 16, paddingTop: 12, paddingBottom: 16, borderTop: "1px solid #e5e7eb" }}>
            <Col xs={24} sm={8} style={{ paddingInline: 8 }}>
              <Space orientation="vertical" align="center" style={{ width: "100%" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Total Revenue
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: 18, color: "#111827" }}>
                  ₹
                  {totalRevenue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 11, color: "#6b7280" }}>
                  {paymentDistributionTotal.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} shown in chart
                </Typography.Text>
              </Space>
            </Col>

            <Col xs={24} sm={8} style={{ paddingInline: 8 }}>
              <Space orientation="vertical" align="center" style={{ width: "100%" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Completed Sales
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: 18, color: "#111827" }}>
                  {completedSalesCount}
                </Typography.Text>
              </Space>
            </Col>

            <Col xs={24} sm={8} style={{ paddingInline: 8 }}>
              <Space orientation="vertical" align="center" style={{ width: "100%" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Unallocated Revenue
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: 18, color: "#d97706" }}>
                  ₹
                  {unallocatedRevenue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography.Text>
              </Space>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}
