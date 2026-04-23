"use client";

import { Card, Empty } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { StockByCategory } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface StockByCategoryChartProps {
  data: StockByCategory[];
  loading: boolean;
}

export default function StockByCategoryChart({ data, loading }: StockByCategoryChartProps) {
  return (
    <Card title="Stock by Category" loading={loading} size="small">
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Stock Value"]}
              labelFormatter={(label) => `Category: ${label}`}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as StockByCategory;
                return (
                  <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>{`Category: ${label}`}</div>
                    <div style={{ fontSize: 12 }}>{`Stock Value: ${formatCurrency(Number(row.totalValue))}`}</div>
                    <div style={{ fontSize: 12 }}>{`Quantity: ${Number(row.totalQuantity).toLocaleString("en-IN")}`}</div>
                  </div>
                );
              }}
            />
            <Bar name="Stock Value" dataKey="totalValue" fill="#1677ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
