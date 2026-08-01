"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { Typography, Spin, Button, Space, Card } from "antd";
import { AppstoreAddOutlined, TagsOutlined, PlusCircleOutlined, CheckCircleFilled, ShopOutlined, UserOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";

dayjs.extend(minMax);

import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { useExpenseAnalytics } from "@/modules/dashboard/hooks/useExpenseAnalytics";
import { useLowStockAlerts } from "@/modules/alerts/hooks/useAlerts";
import { useStore } from "@/providers/StoreProvider";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { useSales } from "@/modules/billing/hooks/useBilling";
import { formatDateTime } from "@/shared/utils/formatDate";
import DashboardTabs, { type DashboardTab } from "@/modules/dashboard/components/DashboardTabs";
import OverviewTab from "@/modules/dashboard/components/OverviewTab";
import StockTab from "@/modules/dashboard/components/StockTab";
import SaleRevenueTab from "@/modules/dashboard/components/SaleRevenueTab";
import { calculateProfitabilityMetrics } from "@/modules/dashboard/services/profitabilityService";

const MobileDashboardPage = dynamic(() => import("@/modules/mobile-dashboard/pages/DashboardPage"));

const { Title, Text } = Typography;

type RevenueView = "day" | "month" | "year";
type DateGroup = "day" | "week" | "month" | "year";
type SalesInternalTab = "overview" | "profitability" | "transactions";
type SalesPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

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

type SalesRow = {
  rowType?: string;
  total?: number | string;
  netAmount?: number | string;
  transactionDate?: string;
  createdAt?: string;
  businessDate?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyCompactK(value: number) {
  if (!Number.isFinite(value)) return "₹0k";
  return `₹${Math.round(value / 1000)}k`;
}

const PageContainer = styled.div`
  padding: 24px;
  background: #f9fafb;
  min-height: 100%;
`;

const PageHeading = styled.h1`
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 500;
  color: #111827;
`;

const DashboardTabContent = styled.div<{ visible: boolean }>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.15s ease;
`;

const WelcomeWrapper = styled.div`
  padding: 40px 24px;
  max-width: 680px;
  margin: 0 auto;
`;

const WelcomeDescription = styled(Text)`
  font-size: 15px;
  display: block;
  margin-bottom: 36px;
`;

const WelcomeStepsCard = styled(Card)`
  border-radius: 16px;
  margin-bottom: 28px;

  .ant-card-body {
    padding: 20px 24px;
  }
`;

const WelcomeStepRow = styled.div<{ done?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  opacity: ${({ done }) => (done ? 0.55 : 1)};
`;

const WelcomeStepLabel = styled.span`
  flex: 1;
  font-size: 15px;
`;

const WelcomeButtonGroup = styled(Space)`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

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
    <WelcomeWrapper>
      <Title level={2} style={{ marginBottom: 4 }}>
        Welcome, {firstName}! 👋
      </Title>
      <WelcomeDescription type="secondary">
        Let&apos;s get your inventory set up. Follow these quick steps to get started.
      </WelcomeDescription>

      <WelcomeStepsCard>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {steps.map((step, i) => (
            <WelcomeStepRow key={i} done={step.done}>
              <CheckCircleFilled
                style={{
                  fontSize: 20,
                  color: step.done ? "#52c41a" : "#d9d9d9",
                  flexShrink: 0,
                }}
              />
              <WelcomeStepLabel>{step.label}</WelcomeStepLabel>
              {!step.done && step.action && (
                <Button size="small" type="primary" onClick={step.action}>
                  Start
                </Button>
              )}
            </WelcomeStepRow>
          ))}
        </Space>
      </WelcomeStepsCard>

      <WelcomeButtonGroup wrap>
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
      </WelcomeButtonGroup>
    </WelcomeWrapper>
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
  // Global period state for Sales & Revenue tab
  const [period, setPeriod] = useState<SalesPeriod>('daily');
  const [salesBreakdownData, setSalesBreakdownData] = useState<Array<{ label: string; totalRevenue: number; discountGiven: number; grossProfit: number; transactionCount: number; period: string }>>([]);
  const [salesBreakdownLoading, setSalesBreakdownLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const today = dayjs().format("YYYY-MM-DD");
  const revenueOfRow = (row: SalesRow | null | undefined) => {
    if (!row) return 0;
    if (row.rowType === "SALE") return Number(row.total ?? 0);
    if (row.rowType === "RETURN_TRANSACTION") return Number(row.netAmount ?? 0);
    return 0;
  };

  const rowDate = (row: SalesRow | null | undefined) => {
    if (!row) return dayjs("");
    if (row.rowType === "SALE") {
      return dayjs(row.transactionDate ?? row.createdAt);
    }
    if (row.rowType === "RETURN_TRANSACTION") {
      return dayjs(row.businessDate ?? row.transactionDate ?? row.createdAt);
    }
    return dayjs(row.createdAt);
  };

  const isCountedTransaction = (row: SalesRow | null | undefined) => {
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

  const getSalesGrouping = useCallback((period: SalesPeriod): DateGroup =>
    period === 'daily' ? 'day' : period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : 'month', []);

  const createSalesRange = (period: SalesPeriod, customRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null): DateRangeWindow => {
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

  const buildSalesBreakdownData = useCallback((
    rows: SalesBreakdownRow[],
    periodType: SalesPeriod,
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
  }, [getSalesGrouping]);

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
  }, [buildSalesBreakdownData, effectiveDateRange, getSalesGrouping, period]);

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

  const overviewTabMetrics = [
    { label: "Total products", value: String(data?.kpis.totalProducts ?? 0), color: "#378ADD" },
    { label: "Total stock value", value: formatCurrency(data?.kpis.totalStockValue ?? 0), color: "#2f855a" },
    { label: "Low stock items", value: String(data?.kpis.lowStockCount ?? 0), color: "#b45309", subLabel: "Needs attention" },
    { label: "Pending POs", value: String(data?.kpis.pendingPOsCount ?? 0), color: "#4b5563", subLabel: "All clear" },
  ];
  
  return (
    <PageContainer>
      <PageHeading>Dashboard</PageHeading>
      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <DashboardTabContent visible={contentVisible}>
      {activeTab === "overview" ? (
        <OverviewTab
          metrics={overviewTabMetrics}
          todayRevenue={todayRevenue}
          totalRevenue={totalRevenue}
          totalSales={totalSales}
          totalSalesThisMonth={totalSalesThisMonth}
          revenueView={revenueView}
          onRevenueViewChange={(value) => setRevenueView(value)}
          chartLoading={chartLoading}
          revenueData={revenueData}
          formatCurrency={formatCurrency}
          formatCurrencyCompactK={formatCurrencyCompactK}
        />
      ) : null}

      {activeTab === "stock" ? (
        <StockTab
          topBrands={topBrands}
          topBrandsChartHeight={topBrandsChartHeight}
          chartLoading={chartLoading}
          stockByCategory={(data?.stockByCategory ?? []).map((row) => ({ category: row.category, totalValue: row.totalValue }))}
          categorySizeHeatmapData={categorySizeHeatmapData}
          lowStockItems={lowStockItems}
          lowStockLoading={lowStockLoading}
          formatCurrency={formatCurrency}
          formatCurrencyCompactK={formatCurrencyCompactK}
        />
      ) : null}

      {activeTab === "sales" ? (
        <SaleRevenueTab
          period={period}
          onPeriodChange={(value) => setPeriod(value)}
          customDateRange={customDateRange}
          onCustomDateRangeChange={(value) => setCustomDateRange(value)}
          salesInternalTab={salesInternalTab}
          onSalesInternalTabChange={(value) => setSalesInternalTab(value)}
          salesPeriodMetrics={salesPeriodMetrics}
          revenueComparison={revenueComparison}
          salesBreakdownLoading={salesBreakdownLoading}
          salesBreakdownData={salesBreakdownData}
          paymentSales={paymentSales}
          activeBucketLabel={activeBucketLabel}
          dayOfWeekPatternData={dayOfWeekPatternData}
          profitabilityKpis={profitabilityKpis}
          expenseAnalyticsLoading={expenseAnalyticsLoading}
          netProfitTrendData={netProfitTrendData}
          grossProfitVsExpenseData={grossProfitVsExpenseData}
          selectedBucketExpenseAnalyticsLoading={selectedBucketExpenseAnalyticsLoading}
          selectedBucketExpenseAnalytics={selectedBucketExpenseAnalytics}
          profitabilitySummary={profitabilitySummary}
          largestExpense={largestExpense}
          chartLoading={chartLoading}
          recentMovements={(data?.recentMovements ?? []).map((movement) => ({
            id: movement.id,
            productName: movement.productName,
            sku: movement.sku,
            sizeLabel: movement.sizeLabel,
            type: movement.type,
            quantity: movement.quantity,
            createdAt: movement.createdAt,
          }))}
          formatCurrency={formatCurrency}
          formatCurrencyCompactK={formatCurrencyCompactK}
          formatDateTime={formatDateTime}
        />
      ) : null}
      </DashboardTabContent>
    </PageContainer>
  );
}

export default DashboardPage;