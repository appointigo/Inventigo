"use client";

import { useMemo, useState } from "react";

type HeatmapDatum = {
  category: string;
  size: string;
  totalSold: number;
};

interface HeatmapProps {
  data: HeatmapDatum[];
  allCategories?: string[];
}

const CARD_BORDER = "0.5px solid #e5e7eb";
const CARD_RADIUS = 12;
const COLOR_RAMP = ["#E6F1FB", "#B5D4F4", "#85B7EB", "#378ADD", "#185FA5", "#0C447C"];

function sortCategoriesWithOtherLast(items: string[]): string[] {
  return [...items].sort((a, b) => {
    const aIsOther = a.trim().toLowerCase() === "other";
    const bIsOther = b.trim().toLowerCase() === "other";
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    return a.localeCompare(b);
  });
}

function getStopIndex(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return 0;
  const pct = (value / maxValue) * 100;
  if (pct <= 20) return 1;
  if (pct <= 40) return 2;
  if (pct <= 60) return 3;
  if (pct <= 80) return 4;
  return 5;
}

export default function CategorySizeHeatmap({ data, allCategories }: HeatmapProps) {
  const categories = useMemo(() => {
    const fromData = Array.from(new Set(data.map((row) => row.category)));
    const merged = [...(allCategories ?? []), ...fromData].filter(Boolean);
    return sortCategoriesWithOtherLast(Array.from(new Set(merged)));
  }, [allCategories, data]);

  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredRows = useMemo(() => {
    if (activeCategory === "All") return data;
    return data.filter((row) => row.category === activeCategory);
  }, [data, activeCategory]);

  const sizes = useMemo(() => {
    return Array.from(new Set(filteredRows.filter((row) => row.totalSold > 0).map((row) => row.size))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredRows]);

  const rowCategories = useMemo(() => {
    if (activeCategory !== "All") {
      return categories.includes(activeCategory) ? [activeCategory] : [];
    }
    return categories;
  }, [activeCategory, categories]);

  const matrix = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredRows) {
      map.set(`${row.category}::${row.size}`, (map.get(`${row.category}::${row.size}`) ?? 0) + row.totalSold);
    }
    return map;
  }, [filteredRows]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of filteredRows) {
      if (row.totalSold > max) max = row.totalSold;
    }
    return max;
  }, [filteredRows]);

  const insight = useMemo(() => {
    if (filteredRows.length === 0 || sizes.length === 0) {
      return (
        <span style={{ color: "#6b7280" }}>No sales data available for this filter.</span>
      );
    }

    if (activeCategory === "All") {
      let top: HeatmapDatum | null = null;
      for (const row of filteredRows) {
        if (!top || row.totalSold > top.totalSold) top = row;
      }

      const sizeTotals = new Map<string, number>();
      for (const row of filteredRows) {
        sizeTotals.set(row.size, (sizeTotals.get(row.size) ?? 0) + row.totalSold);
      }
      const weakestSize = Array.from(sizeTotals.entries()).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "N/A";

      return (
        <span style={{ color: "#6b7280" }}>
          Across all categories, <span style={{ fontWeight: 500, color: "#111827" }}>{top?.category} size {top?.size}</span> is the top seller.
          The weakest size overall is <span style={{ fontWeight: 500, color: "#111827" }}>{weakestSize}</span>.
        </span>
      );
    }

    const categoryRows = filteredRows.filter((row) => row.category === activeCategory);
    const bySize = new Map<string, number>();
    for (const row of categoryRows) {
      bySize.set(row.size, (bySize.get(row.size) ?? 0) + row.totalSold);
    }
    const ordered = Array.from(bySize.entries()).sort((a, b) => b[1] - a[1]);
    const topSize = ordered[0]?.[0] ?? "N/A";
    const slowestSize = ordered[ordered.length - 1]?.[0] ?? "N/A";

    return (
      <span style={{ color: "#6b7280" }}>
        In <span style={{ fontWeight: 500, color: "#111827" }}>{activeCategory}</span>, top demand is
        <span style={{ fontWeight: 500, color: "#111827" }}> size {topSize}</span>.
        Slowest-moving is <span style={{ fontWeight: 500, color: "#111827" }}>size {slowestSize}</span>.
      </span>
    );
  }, [activeCategory, filteredRows, sizes]);

  return (
    <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Size sales by category</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>Darker cell = more units sold</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {["All", ...categories].map((category) => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={{
                borderRadius: 999,
                border: active ? "0.5px solid #85B7EB" : "0.5px solid #e5e7eb",
                background: active ? "#E6F1FB" : "#f3f4f6",
                color: active ? "#0C447C" : "#6b7280",
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          role="img"
          aria-label={`Heatmap showing size sales totals by category for ${activeCategory === "All" ? "all categories" : activeCategory}. Darker blue indicates higher units sold.`}
          style={{ width: "100%", minWidth: 560, borderCollapse: "separate", borderSpacing: "0 8px" }}
        >
          <thead>
            <tr>
              <th
                style={{
                  minWidth: 100,
                  textAlign: "left",
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 500,
                  padding: "0 8px 8px 0",
                  borderBottom: "0.5px solid #e5e7eb",
                }}
              >
                Category
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "#9ca3af",
                    fontWeight: 500,
                    padding: "0 6px 8px",
                    borderBottom: "0.5px solid #e5e7eb",
                  }}
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowCategories.map((category) => (
              <tr key={category}>
                <td style={{ minWidth: 100, fontSize: 12, color: "#111827", paddingRight: 8 }}>{category}</td>
                {sizes.map((size) => {
                  const value = matrix.get(`${category}::${size}`) ?? 0;
                  const stop = getStopIndex(value, maxValue);
                  const bg = COLOR_RAMP[stop];
                  const textColor = stop >= 3 ? "#ffffff" : "#0C447C";
                  return (
                    <td key={`${category}-${size}`} style={{ padding: "2px 6px", textAlign: "center" }}>
                      <div
                        title={`${category} · ${size}: ${value} sold`}
                        style={{
                          width: 52,
                          height: 38,
                          borderRadius: 6,
                          background: bg,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 500,
                          color: textColor,
                        }}
                      >
                        {value > 0 ? value : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6b7280" }}>
        <span>Low</span>
        <div style={{ display: "inline-flex", gap: 2 }}>
          {COLOR_RAMP.map((color) => (
            <span key={color} style={{ width: 20, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
          ))}
        </div>
        <span>High</span>
      </div>

      <div style={{ marginTop: 10, background: "#f3f4f6", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        {insight}
      </div>
    </section>
  );
}
