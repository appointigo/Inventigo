"use client";

import { FundOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Card, Empty, Tooltip as AntTooltip } from "antd";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ExpenseMonthSummary } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ExpenseMonthlyTrendChartProps {
  data: ExpenseMonthSummary[];
  loading: boolean;
  year: number;
}

// Format "2026-03" → "Mar"
const formatMonth = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", { month: "short" });
}

const ExpenseMonthlyTrendChart = ({ data, loading, year }: ExpenseMonthlyTrendChartProps) => {
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    total: d.total,
  }));

  return (
    <Card
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FundOutlined style={{ color: "#3478f6" }} />
          Monthly Expense Trend ({year})
          <AntTooltip title="Monthly spending trend across the selected year.">
            <InfoCircleOutlined style={{ color: "#9aa7b8", cursor: "help", fontSize: 13 }} />
          </AntTooltip>
        </span>
      }
      loading={loading}
      style={{ height: "100%", borderColor: "#e7ebf2", boxShadow: "0 2px 10px rgb(15 23 42 / 3%)" }}
      styles={{ header: { minHeight: 54, paddingInline: 18 }, body: { padding: "18px 14px 16px" } }}
    >
      {chartData.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3478f6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#3478f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8edf4" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#7d8999" }} />
            <YAxis axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#7d8999" }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend verticalAlign="bottom" iconType="circle" formatter={() => "Total Expenses (₹)"} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="total"
              name="Total Expenses"
              stroke="#1677ff"
              strokeWidth={2.5}
              fill="url(#expenseTrendFill)"
              dot={{ r: 4, fill: "#fff", stroke: "#1677ff", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default ExpenseMonthlyTrendChart;
