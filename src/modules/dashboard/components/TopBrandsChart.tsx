"use client";

import { Card, Empty } from "antd";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TopBrand } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface TopBrandsChartProps {
  data: TopBrand[];
  loading: boolean;
}

const COLORS = ["#1677ff", "#52c41a", "#faad14", "#ff4d4f", "#722ed1", "#13c2c2", "#eb2f96"];

export default function TopBrandsChart({ data, loading }: TopBrandsChartProps) {
  return (
    <Card title="Stock Value by Brand" loading={loading} size="small">
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="stockValue"
              nameKey="brand"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={2}
              label={({ name }) => name}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
