"use client";

import { useMemo, useState } from "react";
import { Card, Empty, Segmented } from "antd";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { RevenueTrend } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

type RevenueView = "day" | "month" | "year";

interface RevenueTrendChartProps {
  data: RevenueTrend | null;
  loading: boolean;
}

export default function RevenueTrendChart({ data, loading }: RevenueTrendChartProps) {
  const [view, setView] = useState<RevenueView>("day");

  const chartData = useMemo(() => {
    if (!data) return [];
    return data[view] ?? [];
  }, [data, view]);

  return (
    <Card
      title="Revenue Trend"
      loading={loading}
      size="small"
      extra={
        <Segmented<RevenueView>
          size="small"
          value={view}
          onChange={(value) => setView(value)}
          options={[
            { label: "Day", value: "day" },
            { label: "Month", value: "month" },
            { label: "Year", value: "year" },
          ]}
        />
      }
    >
      {chartData.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Line type="monotone" dataKey="total" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
