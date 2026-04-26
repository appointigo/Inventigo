"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Spin, Button, Space, Card, Skeleton, Empty } from "antd";
import {
  AppstoreAddOutlined,
  TagsOutlined,
  PlusCircleOutlined,
  CheckCircleFilled,
  ShopOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useStore } from "@/providers/StoreProvider";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { formatDateTime } from "@/shared/utils/formatDate";
import CategorySizeHeatmap from "@/modules/dashboard/components/CategorySizeHeatmap";
import DashboardTabs, { type DashboardTab } from "@/modules/dashboard/components/DashboardTabs";
import ProfitMarginSection from "@/modules/dashboard/components/ProfitMarginSection";

const MobileDashboardPage = dynamic(() => import("@/modules/mobile-dashboard/pages/DashboardPage"));

const { Title, Text } = Typography;

const CARD_RADIUS = 12;
const CARD_BORDER = "0.5px solid #e5e7eb";
const BRAND_COLORS = ["#378ADD", "#15A085", "#E67E22", "#5B4DB7", "#D94E8F", "#6B8E23", "#C08A1D", "#E05252", "#0E7490", "#2F6EA8"];

type RevenueView = "day" | "month" | "year";
type SalesBreakdownView = "daily" | "weekly" | "monthly";

type SalesBreakdownRow = {
  period: string;
  total_revenue: number;
  total_discount: number;
  net_profit: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyCompactK(value: number) {
  if (!Number.isFinite(value)) return "₹0k";
  return `₹${Math.round(value / 1000)}k`;
}

function getStockStatus(quantity: number, min: number) {
  const safeMin = min > 0 ? min : 1;
  const ratio = quantity / safeMin;
  if (ratio < 0.3) {
    return { label: "Critical", fill: "#ef4444", badgeBg: "#fee2e2", badgeColor: "#b91c1c" };
  }
  if (ratio < 0.6) {
    return { label: "Low", fill: "#f59e0b", badgeBg: "#fef3c7", badgeColor: "#b45309" };
  }
  return { label: "Healthy", fill: "#22c55e", badgeBg: "#dcfce7", badgeColor: "#166534" };
}

// ─── Welcome Guide (shown when inventory is empty) ───────────────────────────
const WelcomeGuide = ({ userName }: { userName?: string | null }) => {
  const router = useRouter();
  const firstName = userName?.split(" ")[0] ?? "there";

  const steps = [
    { label: "Create your account",     done: true,  icon: <UserOutlined /> },
    { label: "Register your business",  done: true,  icon: <ShopOutlined /> },
    { label: "Add a product category",  done: false, icon: <TagsOutlined />,       action: () => router.push("/dashboard/categories") },
    { label: "Add a brand",             done: false, icon: <AppstoreAddOutlined />, action: () => router.push("/dashboard/brands") },
    { label: "Add your first product",  done: false, icon: <PlusCircleOutlined />,  action: () => router.push("/dashboard/products") },
  ];

  return (
    <div style={{ padding: "40px 24px", maxWidth: 680, margin: "0 auto" }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Welcome, {firstName}! 👋
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 36 }}>
        Let&apos;s get your inventory set up. Follow these quick steps to get started.
      </Text>

      <Card
        style={{ borderRadius: 16, marginBottom: 28 }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: step.done ? 0.55 : 1,
              }}
            >
              <CheckCircleFilled
                style={{
                  fontSize: 20,
                  color: step.done ? "#52c41a" : "#d9d9d9",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: 15 }}>{step.label}</span>
              {!step.done && step.action && (
                <Button size="small" type="primary" onClick={step.action}>
                  Start
                </Button>
              )}
            </div>
          ))}
        </Space>
      </Card>

      <Space wrap>
        <Button
          size="large"
          icon={<AppstoreAddOutlined />}
          onClick={() => router.push("/dashboard/brands")}
        >
          Add Brand
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<TagsOutlined />}
          onClick={() => router.push("/dashboard/categories")}
        >
          Add Category
        </Button>
        <Button
          size="large"
          icon={<PlusCircleOutlined />}
          onClick={() => router.push("/dashboard/products")}
        >
          Add Product
        </Button>
      </Space>
    </div>
  );
}

const DashboardPage = () => {
  const { isMobile, isReady } = useMobileViewport();
  const { data: session } = useSession();
  const { storeId } = useStore();
  const { data, loading } = useDashboard(storeId ?? undefined);
  const { items: lowStockItems, loading: lowStockLoading } = useLowStockAlerts();
  const { sales } = useSales();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [revenueView, setRevenueView] = useState<RevenueView>("day");
  const [salesBreakdownView, setSalesBreakdownView] = useState<SalesBreakdownView>("daily");
  const [salesBreakdownData, setSalesBreakdownData] = useState<Array<{ label: string; totalRevenue: number; discountGiven: number; netProfit: number }>>([]);
  const [salesBreakdownLoading, setSalesBreakdownLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  const today = dayjs().format("YYYY-MM-DD");
  const todaysSales = sales.filter((sale) => dayjs(sale.createdAt).format("YYYY-MM-DD") === today);
  const todayRevenue = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = sales.length;
  const totalSalesThisMonth = sales.filter((sale) => dayjs(sale.createdAt).isSame(dayjs(), "month")).length;

  useEffect(() => {
    setContentVisible(false);
    const timer = setTimeout(() => setContentVisible(true), 10);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const topBrands = useMemo(() => {
    return [...(data?.topBrands ?? [])]
      .sort((a, b) => b.stockValue - a.stockValue)
  }, [data?.topBrands]);

  const categorySizeHeatmapData = useMemo(() => {
    const movementRows = data?.recentMovements ?? [];
    if (movementRows.length === 0) return [];

    const categoryBySkuSize = new Map<string, string>();
    for (const item of lowStockItems) {
      categoryBySkuSize.set(`${item.sku}::${item.sizeLabel}`.toLowerCase(), item.categoryName);
    }

    const knownCategories = (data?.stockByCategory ?? []).map((c) => c.category);
    const aggregated = new Map<string, number>();

    for (const movement of movementRows) {
      if (movement.type !== "SALE") continue;

      const size = movement.sizeLabel?.trim() || "Unknown";
      const qty = Math.abs(Number(movement.quantity) || 0);
      if (qty <= 0) continue;

      const skuSizeKey = `${movement.sku}::${movement.sizeLabel}`.toLowerCase();
      let category = categoryBySkuSize.get(skuSizeKey);

      if (!category) {
        const fromName = knownCategories.find((cat) => movement.productName.toLowerCase().includes(cat.toLowerCase()));
        category = fromName ?? "Other";
      }

      const key = `${category}::${size}`;
      aggregated.set(key, (aggregated.get(key) ?? 0) + qty);
    }

    return Array.from(aggregated.entries()).map(([key, totalSold]) => {
      const [category, size] = key.split("::");
      return { category, size, totalSold };
    });
  }, [data?.recentMovements, data?.stockByCategory, lowStockItems]);

  const revenueData = data?.revenueTrend?.[revenueView] ?? [];

  useEffect(() => {
    let cancelled = false;

    const loadSalesBreakdown = async () => {
      setSalesBreakdownLoading(true);
      try {
        const group = salesBreakdownView === "daily" ? "day" : salesBreakdownView === "weekly" ? "week" : "month";
        const res = await fetch(`/api/reports/sales-breakdown-v2?group=${group}`);
        const rows = res.ok ? (await res.json() as SalesBreakdownRow[]) : [];

        if (cancelled) return;

        const mapped = (Array.isArray(rows) ? rows : []).map((row) => {
          const date = dayjs(row.period);
          const label = salesBreakdownView === "daily"
            ? (date.isValid() ? date.format("DD MMM") : String(row.period))
            : salesBreakdownView === "weekly"
              ? (date.isValid() ? `Wk ${date.format("DD MMM")}` : String(row.period))
              : (date.isValid() ? date.format("MMM YY") : String(row.period));

          return {
            label,
            totalRevenue: Number(row.total_revenue ?? 0),
            discountGiven: Number(row.total_discount ?? 0),
            netProfit: Number(row.net_profit ?? 0),
          };
        });

        setSalesBreakdownData(mapped);
      } catch {
        if (!cancelled) {
          setSalesBreakdownData([]);
        }
      } finally {
        if (!cancelled) {
          setSalesBreakdownLoading(false);
        }
      }
    };

    loadSalesBreakdown();

    return () => {
      cancelled = true;
    };
  }, [salesBreakdownView]);

  const dayOfWeekPatternData = useMemo(() => {
    const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = new Map<string, number>(dayOrder.map((day) => [day, 0]));
    for (const sale of sales) {
      const key = dayOrder[dayjs(sale.createdAt).day()];
      totals.set(key, (totals.get(key) ?? 0) + sale.total);
    }
    return dayOrder.map((day) => ({ day, total: totals.get(day) ?? 0 }));
  }, [sales]);

  const chartLoading = loading;

  if (!isReady) {
    return null;
  }

  if (isMobile) {
    return <MobileDashboardPage />;
  }

  if (loading && !data) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  // Show welcome guide when inventory is empty
  if (!loading && data && data.kpis.totalProducts === 0) {
    return <WelcomeGuide userName={session?.user?.name} />;
  }

  return (
    <div style={{ padding: 24, background: "#f9fafb", minHeight: "100%" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 500, color: "#111827" }}>Dashboard</h1>
      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="dashboard-tab-content" style={{ opacity: contentVisible ? 1 : 0, transition: "opacity 0.15s ease" }}>
      {activeTab === "overview" ? (
        <>
          <div className="dashboard-metric-grid" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total products", value: String(data?.kpis.totalProducts ?? 0), color: "#378ADD" },
              { label: "Total stock value", value: formatCurrency(data?.kpis.totalStockValue ?? 0), color: "#2f855a" },
              { label: "Low stock items", value: String(data?.kpis.lowStockCount ?? 0), color: "#b45309", subLabel: "Needs attention" },
              { label: "Pending POs", value: String(data?.kpis.pendingPOsCount ?? 0), color: "#4b5563", subLabel: "All clear" },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  background: "#f3f4f6",
                  borderRadius: CARD_RADIUS,
                  padding: "1rem",
                  minHeight: 102,
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{metric.label}</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 500, lineHeight: 1.2, color: metric.color }}>{metric.value}</div>
                {metric.subLabel ? (
                  <div style={{ marginTop: 4, fontSize: 11, color: metric.color }}>{metric.subLabel}</div>
                ) : null}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Today&apos;s Revenue</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 500, color: "#185FA5" }}>{formatCurrency(todayRevenue)}</div>
            </div>
            <div style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Total Sales this month</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 500, color: "#111827" }}>{totalSalesThisMonth}</div>
            </div>
          </div>

          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Revenue trend</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "#ecfdf5", color: "#166534", fontSize: 11, padding: "3px 8px" }}>
                  <span style={{ color: "#6b7280" }}>Total Revenue</span>
                  <strong style={{ fontWeight: 600 }}>{formatCurrency(totalRevenue)}</strong>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, padding: "3px 8px" }}>
                  <span style={{ color: "#6b7280" }}>Total Sales</span>
                  <strong style={{ fontWeight: 600 }}>{totalSales}</strong>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "#f3f4f6", color: "#374151", fontSize: 11, padding: "3px 8px" }}>
                  <span style={{ color: "#6b7280" }}>Today&apos;s Revenue</span>
                  <strong style={{ fontWeight: 600 }}>{formatCurrency(todayRevenue)}</strong>
                </div>
              </div>
              <div style={{ display: "inline-flex", gap: 6 }}>
                {([
                  { label: "Day", value: "day" },
                  { label: "Month", value: "month" },
                  { label: "Year", value: "year" },
                ] as const).map((option) => {
                  const active = revenueView === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRevenueView(option.value)}
                      style={{
                        border: "none",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                        background: active ? "#378ADD" : "#f3f4f6",
                        color: active ? "#ffffff" : "#4b5563",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {chartLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            ) : revenueData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No revenue data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                  <Area type="monotone" dataKey="total" stroke="#185FA5" strokeWidth={2.5} fill="#185FA5" fillOpacity={0.12} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>
        </>
      ) : null}

      {activeTab === "stock" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Stock value by brand</div>
            </div>
            {chartLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : topBrands.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No brand stock data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={topBrands} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} vertical />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                  <YAxis type="category" dataKey="brand" width={90} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} labelStyle={{ fontSize: 11, color: "#6b7280" }} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                  <Bar dataKey="stockValue" radius={[0, 4, 4, 0]} barSize={14}>
                    {topBrands.map((_, index) => (
                      <Cell key={index} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Stock by category</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Units per category</div>
            </div>
            {chartLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : (data?.stockByCategory?.length ?? 0) === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No category stock data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.stockByCategory ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                  <Bar dataKey="totalValue" fill="#378ADD" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <CategorySizeHeatmap
            data={categorySizeHeatmapData}
            allCategories={(data?.stockByCategory ?? []).map((row) => row.category)}
          />

          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <WarningOutlined style={{ color: "#d97706", fontSize: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Low stock alerts</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{lowStockItems.length} items below threshold</div>
            </div>
            {lowStockLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            ) : lowStockItems.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>No low stock alerts.</div>
            ) : (
              <table className="dashboard-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {[
                      { label: "Product", align: "left" as const },
                      { label: "Stock", align: "left" as const },
                      { label: "Min", align: "center" as const },
                      { label: "Status", align: "center" as const },
                    ].map((header) => (
                      <th key={header.label} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: header.align, padding: "8px 6px", borderBottom: "0.5px solid #e5e7eb" }}>
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => {
                    const status = getStockStatus(item.quantity, item.reorderLevel);
                    const ratio = Math.max(0, Math.min(1, item.quantity / (item.reorderLevel > 0 ? item.reorderLevel : 1)));
                    return (
                      <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                        <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                          <div style={{ fontSize: 12, color: "#111827" }}>{item.productName}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>{item.sku} · {item.sizeLabel}</div>
                        </td>
                        <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                          <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", background: status.fill }} />
                          </div>
                          <div style={{ marginTop: 4, fontSize: 11, color: "#374151" }}>{item.quantity}</div>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 12, color: "#374151" }}>{item.reorderLevel}</td>
                        <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 500, background: status.badgeBg, color: status.badgeColor }}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "sales" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Sales breakdown</div>
              <div style={{ display: "inline-flex", gap: 6 }}>
                {([
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSalesBreakdownView(option.value)}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: salesBreakdownView === option.value ? "#378ADD" : "#f3f4f6",
                      color: salesBreakdownView === option.value ? "#ffffff" : "#4b5563",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontSize: 11, color: "#4b5563", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#378ADD", display: "inline-block" }} />Total Revenue</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#d4a332", display: "inline-block" }} />Discount given</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#4caf8a", display: "inline-block" }} />Net Profit</span>
            </div>
            {salesBreakdownLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            ) : salesBreakdownData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales breakdown data" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesBreakdownData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0]?.payload as { totalRevenue: number; discountGiven: number; netProfit: number };
                      return (
                        <div style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{String(label ?? "")}</div>
                          <div style={{ fontSize: 12, color: "#378ADD" }}>Total Revenue : {formatCurrency(Number(row.totalRevenue ?? 0))}</div>
                          <div style={{ fontSize: 12, color: "#d4a332" }}>Discount given : {formatCurrency(Number(row.discountGiven ?? 0))}</div>
                          <div style={{ fontSize: 12, color: "#4caf8a" }}>Net Profit : {formatCurrency(Number(row.netProfit ?? 0))}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="totalRevenue" fill="#378ADD" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="discountGiven" fill="#d4a332" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="netProfit" fill="#4caf8a" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>Day-of-week pattern</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayOfWeekPatternData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                <Bar dataKey="total" fill="#185FA5" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <ProfitMarginSection
            formatCurrency={formatCurrency}
            formatCurrencyCompactK={formatCurrencyCompactK}
          />

          <section style={{ background: "#ffffff", border: CARD_BORDER, borderRadius: CARD_RADIUS, padding: 12, overflowX: "auto" }}>
            <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 500, color: "#111827" }}>Recent stock movements</div>
            {chartLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            ) : (data?.recentMovements?.length ?? 0) === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>No recent stock movements.</div>
            ) : (
              <table className="dashboard-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {[
                      { label: "Product", align: "left" as const },
                      { label: "Type", align: "center" as const },
                      { label: "Qty", align: "right" as const },
                      { label: "Time", align: "left" as const },
                    ].map((header) => (
                      <th key={header.label} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textAlign: header.align, padding: "8px 6px", borderBottom: "0.5px solid #e5e7eb" }}>
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentMovements ?? []).map((movement, index) => {
                    const isOut = movement.type === "OUT" || movement.type === "SALE" || movement.quantity < 0;
                    const typeLabel = movement.type === "IN" ? "PURCHASE IN" : movement.type;
                    const typeBadge = isOut
                      ? { bg: "#ffe4e6", color: "#be123c" }
                      : { bg: "#dcfce7", color: "#166534" };
                    const qtyValue = isOut
                      ? `−${Math.abs(movement.quantity)}`
                      : `+${Math.abs(movement.quantity)}`;
                    return (
                      <tr key={movement.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#fcfcfd" }}>
                        <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                          <div style={{ fontSize: 12, color: "#111827" }}>{movement.productName}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>{movement.sku} · {movement.sizeLabel}</div>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6" }}>
                          <span style={{ display: "inline-flex", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 500, background: typeBadge.bg, color: typeBadge.color }}>
                            {typeLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 12, fontWeight: 600, color: isOut ? "#dc2626" : "#16a34a" }}>{qtyValue}</td>
                        <td style={{ padding: "10px 6px", borderBottom: "0.5px solid #f3f4f6", fontSize: 11, color: "#6b7280" }}>{formatDateTime(movement.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : null}
      </div>
      <style jsx>{`
        .dashboard-metric-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .dashboard-table tbody tr {
          transition: background-color 0.15s ease;
        }

        .dashboard-table tbody tr:hover {
          background: #f3f4f6 !important;
        }

        @media (max-width: 1024px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
        }

        @media (max-width: 767px) {
          .dashboard-tab-content > div {
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardPage;