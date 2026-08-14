"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Typography, Spin, Button, Space, Card, Skeleton, Empty, DatePicker, Tag, Segmented, Flex, Tabs } from "antd";
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
import minMax from "dayjs/plugin/minMax";

dayjs.extend(minMax);

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
  LineChart,
  Line,
  ReferenceLine,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useExpenseAnalytics } from "@/modules/dashboard/hooks/useExpenseAnalytics";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useStore } from "@/providers/StoreProvider";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { useSales } from "@/modules/billing/hooks/useBilling";
import type { SaleSummary } from "@/modules/billing/types";
import { formatDateTime } from "@/shared/utils/formatDate";
import CategorySizeHeatmap from "@/modules/dashboard/components/CategorySizeHeatmap";
import DashboardTabs, { type DashboardTab } from "@/modules/dashboard/components/DashboardTabs";
import PaymentMethodDistributionChart from "@/modules/dashboard/components/PaymentMethodDistributionChart";
import { calculateProfitabilityMetrics } from "@/modules/dashboard/services/profitabilityService";

const MobileDashboardPage = dynamic(() => import("@/modules/mobile-dashboard/pages/DashboardPage"));

const { Title, Text } = Typography;

const CARD_RADIUS = 12;
const CARD_BORDER = "0.5px solid #e5e7eb";
const BRAND_COLORS = ["#378ADD", "#15A085", "#E67E22", "#5B4DB7", "#D94E8F", "#6B8E23", "#C08A1D", "#E05252", "#0E7490", "#2F6EA8"];

type RevenueView = "day" | "month" | "year";
type DateGroup = "day" | "week" | "month" | "year";
type SalesInternalTab = "overview" | "profitability" | "transactions";

type SalesBreakdownRow = {
  period: string;
  total_revenue: number;
  total_discount: number;
  net_profit: number;
  transaction_count?: number;
};

type DateRangeWindow = {
  from: string;
  to: string;
};

type DashboardSaleRow = SaleSummary & { rowType?: "SALE" };

type DashboardReturnRow = {
  rowType: "RETURN_TRANSACTION";
  netAmount?: number;
  businessDate?: string;
  transactionDate?: string;
  createdAt: string;
};

type DashboardTransactionRow = DashboardSaleRow | DashboardReturnRow;

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
  const { sales, setFilters: setSalesFilters, setLimit: setSalesLimit, setPage: setSalesPage } = useSales();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [salesInternalTab, setSalesInternalTab] = useState<SalesInternalTab>("overview");
  const [revenueView, setRevenueView] = useState<RevenueView>("day");
  const profitabilityFilterOptions = useMemo(() => {
    return salesInternalTab === "profitability"
      ? (["monthly", "yearly"] as const)
      : (["daily", "weekly", "monthly", "yearly"] as const);
  }, [salesInternalTab]);
  // Global period state for Sales & Revenue tab
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [salesBreakdownData, setSalesBreakdownData] = useState<Array<{ label: string; totalRevenue: number; discountGiven: number; grossProfit: number; transactionCount: number; period: string }>>([]);
  const [salesBreakdownLoading, setSalesBreakdownLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const today = dayjs().format("YYYY-MM-DD");
  const revenueOfRow = (row: DashboardTransactionRow | null | undefined) => {
    if (!row) return 0;
    if (row.rowType === "RETURN_TRANSACTION") return Number(row.netAmount ?? 0);
    return Number((row as SaleSummary).total ?? 0);
  };

  const rowDate = (row: DashboardTransactionRow | null | undefined) => {
    if (!row) return dayjs("");
    if (row.rowType === "RETURN_TRANSACTION") {
      return dayjs(row.businessDate ?? row.transactionDate ?? row.createdAt);
    }
    if (row.rowType === "SALE") {
      return dayjs(row.transactionDate ?? row.createdAt);
    }
    return dayjs(row.createdAt);
  };

  const isCountedTransaction = (row: DashboardTransactionRow | null | undefined) => {
    if (!row) return false;
    if (row.rowType === "SALE") return true;
    if (row.rowType === "RETURN_TRANSACTION") return Number(row.netAmount ?? 0) > 0; // top-ups count as a sale
    return false;
  };

  const todaysSales = sales.filter((sale) => rowDate(sale).format("YYYY-MM-DD") === today);
  const todayRevenue = todaysSales.reduce((sum, sale) => sum + revenueOfRow(sale), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + revenueOfRow(sale), 0);
  const totalSales = sales.reduce((count, sale) => count + (isCountedTransaction(sale) ? 1 : 0), 0);
  const totalSalesThisMonth = sales.filter((sale) => rowDate(sale).isSame(dayjs(), "month") && isCountedTransaction(sale)).length;

  const getSalesGrouping = (period: 'daily' | 'weekly' | 'monthly' | 'yearly'): DateGroup =>
    period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : 'month';

  const createSalesRange = (period: 'daily' | 'weekly' | 'monthly' | 'yearly', customRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null): DateRangeWindow => {
    if (customRange?.[0] && customRange?.[1]) {
      return {
        from: customRange[0].startOf('day').format('YYYY-MM-DD'),
        to: customRange[1].endOf('day').format('YYYY-MM-DD'),
      };
    }

    const now = dayjs().endOf('day');
    if (period === 'daily') {
      return {
        from: now.subtract(6, 'day').startOf('day').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
    }
    if (period === 'weekly') {
      return {
        from: now.subtract(3, 'week').startOf('week').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
    }
    if (period === 'monthly') {
      return {
        from: now.subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
        to: now.format('YYYY-MM-DD'),
      };
    }

    return {
      from: now.subtract(4, 'year').startOf('year').format('YYYY-MM-DD'),
      to: now.format('YYYY-MM-DD'),
    };
  };

  const buildSalesBreakdownData = (
    rows: SalesBreakdownRow[],
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    range: DateRangeWindow
  ) => {
    const group = getSalesGrouping(periodType);
    const start = dayjs(range.from).startOf(group);
    const end = dayjs(range.to).endOf(group);

    const count =
      periodType === 'daily'
        ? Math.max(1, end.diff(start, 'day') + 1)
        : periodType === 'weekly'
        ? Math.max(1, end.diff(start, 'week') + 1)
        : periodType === 'monthly'
        ? Math.max(1, end.diff(start, 'month') + 1)
        : Math.max(1, end.diff(start, 'year') + 1);

    const rowMap = new Map<string, SalesBreakdownRow>();
    for (const row of rows) {
      const key = dayjs(row.period).startOf(group).format('YYYY-MM-DD');
      rowMap.set(key, row);
    }

    return Array.from({ length: count }, (_, index) => {
      const pointDate = start.add(index, group);
      const row = rowMap.get(pointDate.format('YYYY-MM-DD'));
      const label =
        periodType === 'daily'
          ? pointDate.format('DD MMM')
          : periodType === 'weekly'
          ? `${pointDate.format('DD MMM')} – ${pointDate.add(6, 'day').format('DD MMM')}`
          : periodType === 'yearly'
          ? pointDate.format('YYYY')
          : pointDate.format('MMM YYYY');

      return {
        label,
        totalRevenue: Number(row?.total_revenue ?? 0),
        discountGiven: Number(row?.total_discount ?? 0),
        grossProfit: Number(row?.net_profit ?? 0),
        transactionCount: Number(row?.transaction_count ?? 0),
        period: pointDate.format('YYYY-MM-DD'),
      };
    });
  };

  useEffect(() => {
    setContentVisible(false);
    const timer = setTimeout(() => setContentVisible(true), 10);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (salesInternalTab === "profitability" && (period === "daily" || period === "weekly")) {
      setPeriod("monthly");
    }
  }, [period, salesInternalTab]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const topBrands = useMemo(() => {
    return [...(data?.topBrands ?? [])]
      .sort((a, b) => b.stockValue - a.stockValue)
  }, [data?.topBrands]);

  const topBrandsChartHeight = useMemo(() => {
    // Keep each horizontal bar readable when brand count grows.
    return Math.min(760, Math.max(320, topBrands.length * 34));
  }, [topBrands.length]);

  const categorySizeHeatmapData = useMemo(() => {
    const movementRows = data?.recentMovements ?? [];
    if (movementRows.length === 0) return [];
    const aggregated = new Map<string, number>();

    for (const movement of movementRows) {
      if (movement.type !== "SALE") continue;

      const size = movement.sizeLabel?.trim() || "Unknown";
      const qty = Math.abs(Number(movement.quantity) || 0);
      if (qty <= 0) continue;

      const category = movement.categoryName?.trim() || "Other";

      const key = `${category}::${size}`;
      aggregated.set(key, (aggregated.get(key) ?? 0) + qty);
    }

    return Array.from(aggregated.entries()).map(([key, totalSold]) => {
      const [category, size] = key.split("::");
      return { category, size, totalSold };
    });
  }, [data?.recentMovements]);

  const revenueData = data?.revenueTrend?.[revenueView] ?? [];

  const effectiveDateRange = useMemo<DateRangeWindow>(() => createSalesRange(period, customDateRange), [customDateRange, period]);

  useEffect(() => {
    setSalesLimit(5000);
    setSalesPage(1);
    setSalesFilters({
      startDate: effectiveDateRange.from,
      endDate: effectiveDateRange.to,
    });
  }, [effectiveDateRange, setSalesFilters, setSalesLimit, setSalesPage]);

  useEffect(() => {
    let cancelled = false;
    const loadSalesBreakdown = async () => {
      setSalesBreakdownLoading(true);
      try {
        const group = getSalesGrouping(period);
        const params = new URLSearchParams({
          group,
          from: effectiveDateRange.from,
          to: effectiveDateRange.to,
        });
        const res = await fetch(`/api/reports/sales-breakdown-v2?${params.toString()}`);
        const rows = res.ok ? (await res.json() as SalesBreakdownRow[]) : [];
        if (cancelled) return;
        const mapped = buildSalesBreakdownData(Array.isArray(rows) ? rows : [], period, effectiveDateRange);
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
    return () => { cancelled = true; };
  }, [effectiveDateRange, period]);

  const filteredSales = useMemo(() => {
    const startDate = dayjs(effectiveDateRange.from).startOf("day");
    const endDate = dayjs(effectiveDateRange.to).endOf("day");

    return sales.filter((sale) => {
      const saleDate = rowDate(sale);
      return !saleDate.isBefore(startDate) && !saleDate.isAfter(endDate);
    });
  }, [effectiveDateRange, sales]);

  const latestBucketSales = useMemo(() => {
    if (customDateRange || salesBreakdownData.length === 0) {
      return filteredSales;
    }

    const lastBucket = salesBreakdownData[salesBreakdownData.length - 1];
    if (!lastBucket?.period) {
      return filteredSales;
    }

    const bucketStart = dayjs(lastBucket.period).startOf("day");
    const bucketEnd = period === "weekly"
      ? bucketStart.add(6, "day").endOf("day")
      : period === "monthly"
      ? bucketStart.endOf("month")
      : period === "yearly"
      ? bucketStart.endOf("year")
      : bucketStart.endOf("day");

    return sales.filter((sale) => {
      const saleDate = rowDate(sale);
      return !saleDate.isBefore(bucketStart) && !saleDate.isAfter(bucketEnd);
    });
  }, [customDateRange, salesBreakdownData, period, filteredSales, sales]);

  const paymentSales = useMemo(() => {
    return latestBucketSales;
  }, [latestBucketSales]);

  const dayOfWeekPatternData = useMemo(() => {
    const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = new Map<string, number>(dayOrder.map((day) => [day, 0]));
    for (const sale of latestBucketSales) {
      const key = dayOrder[rowDate(sale).day()];
      totals.set(key, (totals.get(key) ?? 0) + revenueOfRow(sale));
    }
    return dayOrder.map((day) => ({ day, total: totals.get(day) ?? 0 }));
  }, [latestBucketSales]);

  const salesRangeLabel = useMemo(() => {
    if (filteredSales.length === 0) {
      return "No data";
    }
    const dates = filteredSales.map((sale) => rowDate(sale));
    const minDate = dayjs.min(dates);
    const maxDate = dayjs.max(dates);
    if (!minDate || !maxDate) {
      return "No data";
    }
    return `${minDate.format("MMM DD")} – ${maxDate.format("MMM DD, YYYY")}`;
  }, [filteredSales]);

  const activeBucketLabel = useMemo(() => {
    if (customDateRange || salesBreakdownData.length === 0) {
      return salesRangeLabel;
    }

    const lastBucket = salesBreakdownData[salesBreakdownData.length - 1];
    if (!lastBucket?.period) {
      return salesRangeLabel;
    }

    const bucketStart = dayjs(lastBucket.period).startOf("day");
    const bucketEnd = period === "weekly"
      ? bucketStart.add(6, "day").endOf("day")
      : period === "monthly"
      ? bucketStart.endOf("month")
      : period === "yearly"
      ? bucketStart.endOf("year")
      : bucketStart.endOf("day");

    return `${bucketStart.format("DD MMM YYYY")} – ${bucketEnd.format("DD MMM YYYY")}`;
  }, [customDateRange, salesBreakdownData, period, salesRangeLabel]);

  const revenueComparison = useMemo(() => {
    const label = customDateRange
      ? "vs previous range"
      : period === "daily"
      ? "vs yesterday"
      : period === "weekly"
      ? "vs previous week"
      : period === "monthly"
      ? "vs previous month"
      : "vs previous year";

    let currentRevenue = 0;
    let previousRevenue = 0;

    if (customDateRange?.[0] && customDateRange?.[1]) {
      const start = customDateRange[0].startOf("day");
      const end = customDateRange[1].endOf("day");
      const rangeDays = end.diff(start, "day") + 1;

      currentRevenue = filteredSales.reduce((sum, sale) => sum + revenueOfRow(sale), 0);

      const previousEnd = start.subtract(1, "day").endOf("day");
      const previousStart = previousEnd.subtract(rangeDays - 1, "day").startOf("day");

      previousRevenue = sales
        .filter((sale) => {
          const saleDate = rowDate(sale);
          return !saleDate.isBefore(previousStart) && !saleDate.isAfter(previousEnd);
        })
        .reduce((sum, sale) => sum + revenueOfRow(sale), 0);
    } else {
      const last = salesBreakdownData[salesBreakdownData.length - 1];
      const previous = salesBreakdownData[salesBreakdownData.length - 2];
      currentRevenue = Number(last?.totalRevenue ?? 0);
      previousRevenue = Number(previous?.totalRevenue ?? 0);
    }

    const difference = currentRevenue - previousRevenue;
    const percentage = previousRevenue !== 0
      ? Math.round((difference / previousRevenue) * 100)
      : difference > 0
      ? 100
      : 0;

    return {
      label,
      percentage: Math.abs(percentage),
      isPositive: difference >= 0,
    };
  }, [period, customDateRange, filteredSales, sales, salesBreakdownData]);

  const salesPeriodSummary = useMemo(() => {
    let totalRevenueForPeriod = 0;
    let totalDiscount = 0;
    let totalGrossProfit = 0;
    let transactionCount = 0;

    const lastBucket = salesBreakdownData[salesBreakdownData.length - 1];
    const shouldUseLatestBucket = !customDateRange;

    if (shouldUseLatestBucket && lastBucket) {
      totalRevenueForPeriod = Number(lastBucket.totalRevenue ?? 0);
      totalDiscount = Number(lastBucket.discountGiven ?? 0);
      totalGrossProfit = Number(lastBucket.grossProfit ?? 0);
      transactionCount = Number(lastBucket.transactionCount ?? 0);
    } else {
      totalRevenueForPeriod = salesBreakdownData.reduce((sum, row) => sum + Number(row.totalRevenue ?? 0), 0);
      totalDiscount = salesBreakdownData.reduce((sum, row) => sum + Number(row.discountGiven ?? 0), 0);
      totalGrossProfit = salesBreakdownData.reduce((sum, row) => sum + Number(row.grossProfit ?? 0), 0);
      transactionCount = salesBreakdownData.reduce((sum, row) => sum + Number(row.transactionCount ?? 0), 0);
    }

    const marginPct = totalRevenueForPeriod > 0 ? Math.round((totalGrossProfit / totalRevenueForPeriod) * 100) : 0;
    const discountPct = totalRevenueForPeriod > 0 ? Math.round((totalDiscount / totalRevenueForPeriod) * 100) : 0;

    return {
      totalRevenueForPeriod,
      totalDiscount,
      totalGrossProfit,
      transactionCount,
      marginPct,
      discountPct,
    };
  }, [customDateRange, salesBreakdownData]);

  const salesPeriodMetrics = useMemo(() => {
    const { totalRevenueForPeriod, totalDiscount, totalGrossProfit, transactionCount, marginPct, discountPct } = salesPeriodSummary;

    return [
      {
        label: "Total revenue",
        value: `₹${totalRevenueForPeriod.toLocaleString("en-IN")}`,
        color: "#378ADD",
        subLabel: undefined,
      },
      {
        label: "Gross profit",
        value: `₹${totalGrossProfit.toLocaleString("en-IN")}`,
        color: "#2f855a",
        subLabel: `${marginPct}% margin`,
      },
      {
        label: "Discount given",
        value: `₹${totalDiscount.toLocaleString("en-IN")}`,
        color: "#b45309",
        subLabel: `${discountPct}% of revenue`,
      },
      {
        label: "Total sales",
        value: transactionCount.toString(),
        color: "#111827",
        subLabel: "transactions",
      },
    ];
  }, [salesPeriodSummary]);

  const chartLoading = loading;

  const selectedBucketDateRange = useMemo<DateRangeWindow>(() => {
    if (customDateRange?.[0] && customDateRange?.[1]) {
      return effectiveDateRange;
    }

    const lastBucket = salesBreakdownData[salesBreakdownData.length - 1];
    if (!lastBucket?.period) {
      return effectiveDateRange;
    }

    const bucketStart = dayjs(lastBucket.period).startOf("day");
    const bucketEnd = period === "weekly"
      ? bucketStart.add(6, "day").endOf("day")
      : period === "monthly"
      ? bucketStart.endOf("month")
      : period === "yearly"
      ? bucketStart.endOf("year")
      : bucketStart.endOf("day");

    return {
      from: bucketStart.format("YYYY-MM-DD"),
      to: bucketEnd.format("YYYY-MM-DD"),
    };
  }, [customDateRange, effectiveDateRange, period, salesBreakdownData]);

  const { data: expenseAnalytics, loading: expenseAnalyticsLoading } = useExpenseAnalytics(
    storeId ?? null,
    period,
    effectiveDateRange.from,
    effectiveDateRange.to,
  );
  const { data: selectedBucketExpenseAnalytics, loading: selectedBucketExpenseAnalyticsLoading } = useExpenseAnalytics(
    storeId ?? null,
    period,
    selectedBucketDateRange.from,
    selectedBucketDateRange.to,
  );

  const selectedExpenseAmount = useMemo(() => {
    if (customDateRange?.[0] && customDateRange?.[1]) {
      return selectedBucketExpenseAnalytics?.summary.totalExpense ?? 0;
    }

    const latestBucket = salesBreakdownData[salesBreakdownData.length - 1];
    const matchingExpense = (selectedBucketExpenseAnalytics?.trend ?? []).find((row) => row.period === latestBucket?.period);
    return matchingExpense?.amount ?? selectedBucketExpenseAnalytics?.summary.totalExpense ?? 0;
  }, [customDateRange, salesBreakdownData, selectedBucketExpenseAnalytics?.summary.totalExpense, selectedBucketExpenseAnalytics?.trend]);

  const profitabilityMetrics = useMemo(() => {
    const revenue = salesPeriodSummary.totalRevenueForPeriod;
    const grossProfit = salesPeriodSummary.totalGrossProfit;
    const operatingExpenses = selectedExpenseAmount;

    return calculateProfitabilityMetrics({
      revenue,
      grossProfit,
      operatingExpenses,
      revenueGrowthPct: revenueComparison.isPositive ? revenueComparison.percentage : -revenueComparison.percentage,
    });
  }, [revenueComparison.isPositive, revenueComparison.percentage, salesPeriodSummary.totalGrossProfit, salesPeriodSummary.totalRevenueForPeriod, selectedExpenseAmount]);

  const profitabilityKpis = useMemo(() => {
    return [
      { label: "Revenue", value: formatCurrency(profitabilityMetrics.revenue), color: "#378ADD" },
      { label: "Gross Profit", value: formatCurrency(profitabilityMetrics.grossProfit), color: "#2f855a" },
      { label: "Operating Expenses", value: formatCurrency(profitabilityMetrics.operatingExpenses), color: "#b45309" },
      { label: "Net Profit", value: formatCurrency(profitabilityMetrics.netProfit), color: profitabilityMetrics.netProfit >= 0 ? "#2563eb" : "#dc2626" },
    ];
  }, [profitabilityMetrics]);

  const profitabilityComparisonData = useMemo(() => {
    return salesBreakdownData.map((row) => ({
      label: row.label,
      period: row.period,
      revenue: Number(row.totalRevenue ?? 0),
      grossProfit: Number(row.grossProfit ?? 0),
    }));
  }, [salesBreakdownData]);

  const grossProfitVsExpenseData = useMemo(() => {
    const expenseTrend = expenseAnalytics?.trend ?? [];
    const expenseMap = new Map(expenseTrend.map((row) => [row.period, row.amount]));

    return salesBreakdownData.map((row) => ({
      label: row.label,
      period: row.period,
      grossProfit: Number(row.grossProfit ?? 0),
      operatingExpenses: expenseMap.get(row.period) ?? 0,
    }));
  }, [expenseAnalytics?.trend, salesBreakdownData]);

  const netProfitTrendData = useMemo(() => {
    const expenseTrend = expenseAnalytics?.trend ?? [];
    const expenseMap = new Map(expenseTrend.map((row) => [row.period, row.amount]));

    return (salesBreakdownData ?? []).map((row) => ({
      label: row.label,
      period: row.period,
      netProfit: Number(row.grossProfit ?? 0) - (expenseMap.get(row.period) ?? 0),
    }));
  }, [expenseAnalytics?.trend, salesBreakdownData]);

  const largestExpense = useMemo(() => {
    return [...(selectedBucketExpenseAnalytics?.breakdown ?? [])].sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [selectedBucketExpenseAnalytics?.breakdown]);

  const profitabilitySummary = useMemo(() => ({
    revenue: profitabilityMetrics.revenue,
    grossProfit: profitabilityMetrics.grossProfit,
    operatingExpenses: profitabilityMetrics.operatingExpenses,
    netProfit: profitabilityMetrics.netProfit,
    grossMarginPct: profitabilityMetrics.grossMarginPct,
    netProfitMarginPct: profitabilityMetrics.netProfitMarginPct,
    expenseRatioPct: profitabilityMetrics.expenseRatioPct,
    profitToExpenseRatio: profitabilityMetrics.profitToExpenseRatio,
    businessHealth: profitabilityMetrics.businessHealthStatus,
    breakEvenRevenue: profitabilityMetrics.breakEvenRevenue,
    breakEvenGap: profitabilityMetrics.breakEvenGap,
  }), [profitabilityMetrics]);

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
              <ResponsiveContainer width="100%" height={topBrandsChartHeight}>
                <BarChart layout="vertical" data={topBrands} margin={{ top: 8, right: 12, left: 24, bottom: 8 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} vertical />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                  <YAxis type="category" dataKey="brand" width={180} interval={0} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
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
        <div className="grid gap-4" style={{ display: "grid", gap: 16 }}>
          <Flex align="center" justify="space-between" gap={16}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#6b7280 " }}>
              {dayjs().format("DD MMM YYYY")}
            </div>
            <div style={{ display: "inline-flex", borderRadius: 8, background: "#f3f4f6", padding: "4px" }}>
              <Segmented
                options={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                  { label: "Yearly", value: "yearly" },
                ]}
                value={period}
                onChange={(value) => setPeriod(value as "daily" | "weekly" | "monthly" | "yearly")}
                disabled={!!(customDateRange && customDateRange[0] && customDateRange[1])}
                size="medium"
                style={{ background: "transparent", borderRadius: 6 }}
              />
            </div>
          </Flex>

          <Flex align="center" gap={12} style={{ padding: "12px 0" }}>
            <DatePicker.RangePicker
              value={customDateRange}
              onChange={(dates) => {
                setCustomDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
                if (dates && dates[0] && dates[1]) {
                  setPeriod("daily");
                }
              }}
              format="DD MMM YYYY"
              style={{ width: "auto", minWidth: 280 }}
            />
          </Flex>

          <Tabs
            activeKey={salesInternalTab}
            onChange={(key) => setSalesInternalTab(key as SalesInternalTab)}
            size="small"
            tabBarStyle={{ background: "#f3f4f6", padding: "4px 6px", borderRadius: 10, marginBottom: 16 }}
            items={[
              {
                key: "overview",
                label: "Overview",
                children: (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                      {salesPeriodMetrics.map((metric) => {
                        const isTotalRevenue = metric.label === "Total revenue";
                        const isNetProfit = metric.label === "Net profit";
                        const isDiscountGiven = metric.label === "Discount given";

                        let textColor = metric.color;
                        if (isNetProfit) textColor = "#1D9E75";
                        if (isDiscountGiven) textColor = "#D85A30";

                        return (
                          <div
                            key={metric.label}
                            style={{
                              background: "#ffffff",
                              border: "0.5px solid rgba(0, 0, 0, 0.10)",
                              borderRadius: 12,
                              padding: 20,
                            }}
                          >
                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, lineHeight: 1.4 }}>
                              {metric.label}
                            </div>
                            <div
                              style={{
                                fontSize: isTotalRevenue ? 32 : 26,
                                fontWeight: 500,
                                lineHeight: 1.2,
                                color: textColor,
                                marginBottom: isTotalRevenue ? 8 : 0,
                              }}
                            >
                              {metric.value}
                            </div>
                            {isTotalRevenue && (
                              <Tag
                                color={revenueComparison.isPositive ? "success" : "error"}
                                style={{
                                  borderRadius: 999,
                                  fontWeight: 500,
                                  padding: "4px 10px",
                                  marginTop: 4,
                                }}
                              >
                                {`${revenueComparison.isPositive ? "+" : "-"}${revenueComparison.percentage}% ${revenueComparison.label}`}
                              </Tag>
                            )}
                            {metric.subLabel && isNetProfit && (
                              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                                {metric.subLabel}
                              </div>
                            )}
                            {metric.subLabel && isDiscountGiven && (
                              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                                {metric.subLabel}
                              </div>
                            )}
                            {metric.subLabel && !isNetProfit && !isDiscountGiven && (
                              <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                                {metric.subLabel}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Sales breakdown</div>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 12, height: 12, background: "#378ADD", borderRadius: 2 }} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Revenue</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 12, height: 12, background: "#d4a332", borderRadius: 2 }} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Discount</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 12, height: 12, background: "#4caf8a", borderRadius: 2 }} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Profit</span>
                          </div>
                        </div>
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
                                const row = payload[0]?.payload as { totalRevenue: number; discountGiven: number; grossProfit: number };
                                return (
                                  <div style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>{String(label ?? "")}</div>
                                    <div style={{ fontSize: 12, color: "#378ADD" }}>Total Revenue : {formatCurrency(Number(row.totalRevenue ?? 0))}</div>
                                    <div style={{ fontSize: 12, color: "#d4a332" }}>Discount given : {formatCurrency(Number(row.discountGiven ?? 0))}</div>
                                    <div style={{ fontSize: 12, color: "#4caf8a" }}>Gross Profit : {formatCurrency(Number(row.grossProfit ?? 0))}</div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="totalRevenue" fill="#378ADD" radius={[4, 4, 0, 0]} barSize={14} />
                            <Bar dataKey="discountGiven" fill="#d4a332" radius={[4, 4, 0, 0]} barSize={14} />
                            <Bar dataKey="grossProfit" fill="#4caf8a" radius={[4, 4, 0, 0]} barSize={14} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </section>

                    <div style={{ display: "grid", gridTemplateColumns: "1.22fr 0.78fr", gap: 12 }}>
                      <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Payment method distribution</div>
                        <PaymentMethodDistributionChart
                          sales={paymentSales}
                          loading={false}
                          height={340}
                          activeBucketLabel={activeBucketLabel}
                        />
                      </section>

                      <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Day-of-week pattern</div>
                        <ResponsiveContainer width="100%" height={340}>
                          <BarChart data={dayOfWeekPatternData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                            <Bar dataKey="total" fill="#185FA5" radius={[4, 4, 0, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      </section>
                    </div>
                  </div>
                ),
              },
              {
                key: "profitability",
                label: "Profitability",
                children: (
                  <div style={{ display: "grid", gap: 16 }}>
                    <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Profitability summary</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                        {profitabilityKpis.map((metric) => (
                          <div
                            key={metric.label}
                            style={{
                              background: "#f9fafb",
                              border: "0.5px solid #e5e7eb",
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{metric.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 600, color: metric.color }}>{metric.value}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Revenue vs gross profit</div>
                      {salesBreakdownLoading ? (
                        <Skeleton active paragraph={{ rows: 4 }} title={false} />
                      ) : profitabilityComparisonData.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No profitability comparison data" />
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={profitabilityComparisonData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                            <Bar dataKey="revenue" fill="#378ADD" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="grossProfit" fill="#2f855a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </section>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                      <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Net profit trend</div>
                        {expenseAnalyticsLoading ? (
                          <Skeleton active paragraph={{ rows: 4 }} title={false} />
                        ) : netProfitTrendData.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No net profit data" />
                        ) : (
                          <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={netProfitTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                              <Area type="monotone" dataKey="netProfit" stroke="#2f855a" fill="#dcfce7" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </section>

                      <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Gross profit vs operating expenses</div>
                        {expenseAnalyticsLoading ? (
                          <Skeleton active paragraph={{ rows: 4 }} title={false} />
                        ) : grossProfitVsExpenseData.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No operating expense comparison data" />
                        ) : (
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={grossProfitVsExpenseData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrencyCompactK(Number(value))} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ borderRadius: 8, border: "0.5px solid #e5e7eb" }} />
                              <Bar dataKey="grossProfit" fill="#2f855a" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="operatingExpenses" fill="#b45309" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </section>

                      <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Expense breakdown</div>
                        {selectedBucketExpenseAnalyticsLoading ? (
                          <Skeleton active paragraph={{ rows: 4 }} title={false} />
                        ) : (selectedBucketExpenseAnalytics?.breakdown?.length ?? 0) === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expense breakdown" />
                        ) : (
                          <div style={{ display: "grid", gap: 12 }}>
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie data={selectedBucketExpenseAnalytics?.breakdown ?? []} dataKey="amount" nameKey="category" innerRadius={54} outerRadius={86} paddingAngle={2}>
                                  {(selectedBucketExpenseAnalytics?.breakdown ?? []).map((entry, index) => (
                                    <Cell key={`${entry.category}-${index}`} fill={["#378ADD", "#b45309", "#2f855a", "#8b5cf6", "#ef4444", "#f59e0b"][index % 6]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: "grid", gap: 8 }}>
                              {(selectedBucketExpenseAnalytics?.breakdown ?? []).slice(0, 4).map((entry) => (
                                <div key={entry.category} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#374151" }}>
                                  <span>{entry.category}</span>
                                  <span style={{ fontWeight: 600 }}>{entry.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    </div>

                    <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Business health</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb" }}>
                          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Overall status</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: profitabilitySummary.businessHealth === "Healthy" ? "#2f855a" : profitabilitySummary.businessHealth === "Good" ? "#2563eb" : profitabilitySummary.businessHealth === "Average" ? "#d97706" : "#dc2626" }}>
                            {profitabilitySummary.businessHealth}
                          </div>
                          <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#6b7280" }}>
                            <div>Gross margin: {profitabilitySummary.grossMarginPct}%</div>
                            <div>Net profit margin: {profitabilitySummary.netProfitMarginPct}%</div>
                            <div>Expense ratio: {profitabilitySummary.expenseRatioPct}%</div>
                            <div>Profit-to-expense ratio: {profitabilitySummary.profitToExpenseRatio.toFixed(2)}x</div>
                            <div>Revenue growth: {revenueComparison.isPositive ? "+" : "-"}{revenueComparison.percentage}%</div>
                          </div>
                        </div>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb" }}>
                          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Key note</div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                            {largestExpense ? `${largestExpense.category} is the largest expense bucket at ${formatCurrency(largestExpense.amount)}.` : "Expense data is still being collected for this period."}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                            {profitabilitySummary.breakEvenGap >= 0
                              ? `Your business is operating above break-even.`
                              : `You are ${formatCurrency(Math.abs(profitabilitySummary.breakEvenGap))} below break-even this period.`}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                            Break-even revenue: {formatCurrency(profitabilitySummary.breakEvenRevenue)}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ),
              },
              {
                key: "transactions",
                label: "Transactions",
                children: (
                  <section style={{ background: "#ffffff", border: "0.5px solid rgba(0, 0, 0, 0.10)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                    <div style={{ marginBottom: 16, fontSize: 15, fontWeight: 500, color: "#111827" }}>Recent stock movements</div>
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
                ),
              },
            ]}
          />
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

        @media (max-width: 1400px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }

          .dashboard-tab-content > div > div:nth-child(5) {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }

          .dashboard-tab-content > div > div:nth-child(8) {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
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