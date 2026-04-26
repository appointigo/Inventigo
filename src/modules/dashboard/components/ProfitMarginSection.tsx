"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Skeleton } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type PeriodGroup = "day" | "week" | "month";

type ProfitMarginPoint = {
  period: string;
  total_revenue: number;
  total_cost: number;
  total_discount: number;
  gross_profit: number;
  margin_pct: number;
};

interface ProfitMarginSectionProps {
  formatCurrency: (value: number) => string;
  formatCurrencyCompactK: (value: number) => string;
  period: "daily" | "weekly" | "monthly";
}

const PRIMARY_BLUE = "#378ADD";

type TooltipMode = "profit" | "discount";

export default function ProfitMarginSection({
  formatCurrency,
  formatCurrencyCompactK,
  period,
}: ProfitMarginSectionProps) {
  const [profitRows, setProfitRows] = useState<ProfitMarginPoint[]>([]);
  const [discountRows, setDiscountRows] = useState<ProfitMarginPoint[]>([]);
  const [profitLoading, setProfitLoading] = useState(true);
  const [discountLoading, setDiscountLoading] = useState(true);

  const group: PeriodGroup = period === "daily" ? "day" : period === "weekly" ? "week" : "month";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setProfitLoading(true);
      try {
        const res = await fetch(`/api/reports/profit-margin?group=${group}`);
        const payload = res.ok ? ((await res.json()) as ProfitMarginPoint[]) : [];
        if (!cancelled) {
          setProfitRows(Array.isArray(payload) ? payload : []);
        }
      } catch {
        if (!cancelled) {
          setProfitRows([]);
        }
      } finally {
        if (!cancelled) {
          setProfitLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [group]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setDiscountLoading(true);
      try {
        const res = await fetch(`/api/reports/profit-margin?group=${group}`);
        const payload = res.ok ? ((await res.json()) as ProfitMarginPoint[]) : [];
        if (!cancelled) {
          setDiscountRows(Array.isArray(payload) ? payload : []);
        }
      } catch {
        if (!cancelled) {
          setDiscountRows([]);
        }
      } finally {
        if (!cancelled) {
          setDiscountLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [group]);

  const profitChartData = useMemo(
    () => profitRows.map((row) => ({ ...row, gross_profit: Number(row.gross_profit) || 0, margin_pct: Number(row.margin_pct) || 0 })),
    [profitRows]
  );

  const discountChartData = useMemo(
    () =>
      discountRows.map((row) => {
        const totalRevenue = Number(row.total_revenue) || 0;
        const totalDiscount = Number(row.total_discount) || 0;
        const discountPct = totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0;
        return {
          ...row,
          total_discount: totalDiscount,
          discount_pct: Number(discountPct.toFixed(1)),
        };
      }),
    [discountRows]
  );

  const renderTooltip = (mode: TooltipMode) => {
    return ({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>; label?: string | number }) => {
      if (!active || !payload?.length) return null;
      const row = payload[0]?.payload as (ProfitMarginPoint & { discount_pct?: number }) | undefined;
      if (!row) return null;

      if (mode === "profit") {
        return (
          <div style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: PRIMARY_BLUE }}>gross_profit : {formatCurrency(Number(row.gross_profit) || 0)}</div>
            <div style={{ fontSize: 12, color: PRIMARY_BLUE }}>margin_pct : {(Number(row.margin_pct) || 0).toFixed(1)}%</div>
          </div>
        );
      }

      return (
        <div style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: PRIMARY_BLUE }}>discount : {formatCurrency(Number(row.total_discount) || 0)}</div>
          <div style={{ fontSize: 12, color: PRIMARY_BLUE }}>discount_pct : {(Number(row.discount_pct) || 0).toFixed(1)}%</div>
        </div>
      );
    };
  };

  return (
    <>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>Profit margin %</div>

        {profitLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : profitChartData.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No profit margin data" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={profitChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
              <Tooltip content={renderTooltip("profit")} />
              <Bar dataKey="gross_profit" fill={PRIMARY_BLUE} radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>Discount Impact (₹)</div>

        {discountLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : discountChartData.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No discount data" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={discountChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
              <Tooltip content={renderTooltip("discount")} />
              <Bar dataKey="total_discount" fill={PRIMARY_BLUE} radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
