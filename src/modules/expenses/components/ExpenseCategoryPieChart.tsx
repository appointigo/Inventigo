"use client";

import { Card, Empty } from "antd";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ExpenseCategoryTotals, ExpenseCategory } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

interface ExpenseCategoryPieChartProps {
  byCategory: ExpenseCategoryTotals;
  loading: boolean;
}

const COLORS = ["#1677ff", "#52c41a", "#faad14", "#ff4d4f", "#722ed1", "#13c2c2"];

export default function ExpenseCategoryPieChart({
  byCategory,
  loading,
}: ExpenseCategoryPieChartProps) {
  const data = (Object.entries(byCategory) as [ExpenseCategory, number][])
    .filter(([, val]) => val > 0)
    .map(([key, value]) => ({ name: key, value }));

  return (
    <Card title="Expenses by Category" loading={loading} size="small">
      {data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={45}
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
