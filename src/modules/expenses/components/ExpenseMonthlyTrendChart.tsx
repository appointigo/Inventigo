"use client";

import { Card, Empty } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ExpenseMonthSummary } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ExpenseMonthlyTrendChartProps {
  data: ExpenseMonthSummary[];
  loading: boolean;
}

// Format "2026-03" → "Mar"
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", { month: "short" });
}

export default function ExpenseMonthlyTrendChart({
  data,
  loading,
}: ExpenseMonthlyTrendChartProps) {
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    total: d.total,
  }));

  return (
    <Card title="Monthly Expense Trend" loading={loading} size="small">
      {chartData.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `₹${(v as number / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#1677ff"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
