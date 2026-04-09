"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySignup } from "../../types";

interface Props {
  data: WeeklySignup[];
}

const PlatformAdminBarChart = ({ data }: Props) => {
  const chartData = useMemo(
    () => data.map((d) => ({ name: d.week, signups: d.count })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#f0f4f8" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar
          dataKey="signups"
          fill="url(#barGrad)"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
        />
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1677ff" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PlatformAdminBarChart;
