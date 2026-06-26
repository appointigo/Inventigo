import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { stockService } from "@/modules/stock/services/stockService";
import type { DashboardData, StockByCategory, TopBrand, RecentMovement, RevenueTrendPoint, RevenueTrend } from "../types";

const formatDayKey = (date: Date) => date.toISOString().slice(0, 10);
const formatMonthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const formatYearKey = (date: Date) => String(date.getUTCFullYear());

const shiftDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const shiftMonths = (date: Date, months: number) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const buildRangePoints = (
  count: number,
  keyForOffset: (offset: number) => string,
  labelForKey: (key: string) => string,
  totalsMap: Map<string, number>
): RevenueTrendPoint[] => {
  return Array.from({ length: count }, (_, i) => {
    const offset = i - (count - 1);
    const key = keyForOffset(offset);
    return {
      label: labelForKey(key),
      total: Number((totalsMap.get(key) ?? 0).toFixed(2)),
    };
  });
};

async function hasColumn(tableName: string, columnName: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_column: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) AS has_column
    `;

    return result[0]?.has_column ?? false;
  } catch {
    return false;
  }
}

async function hasTable(tableName: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_table: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
      ) AS has_table
    `;

    return result[0]?.has_table ?? false;
  } catch {
    return false;
  }
}

export const dashboardServiceCompat = {
  async getData(orgId: string, storeId: string | null, startDate?: Date, endDate?: Date): Promise<DashboardData> {
    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const firstStore = await prisma.store.findFirst({ where: { orgId }, select: { id: true } });
      resolvedStoreId = firstStore?.id ?? null;
    }

    const baseResults = await Promise.allSettled([
      resolvedStoreId
        ? stockService.getStockLevels({ storeId: resolvedStoreId, page: 1, pageSize: 1000 })
        : Promise.resolve({ items: [], total: 0 }),
      resolvedStoreId
        ? stockService.getMovementHistory({
            storeId: resolvedStoreId,
            startDate,
            endDate,
            page: 1,
            pageSize: startDate || endDate ? 1000 : 10,
          })
        : Promise.resolve({ items: [], total: 0 }),
      prisma.product.findMany({
        where: { orgId },
        select: { id: true, costPrice: true },
      }),
      prisma.purchaseOrder.count({
        where: { status: { in: ["DRAFT", "ORDERED"] }, store: { orgId } },
      }),
      prisma.product.count({ where: { orgId } }),
    ]);

    const stockResult = baseResults[0].status === "fulfilled" ? baseResults[0].value : { items: [], total: 0 };
    const movementsResult = baseResults[1].status === "fulfilled" ? baseResults[1].value : { items: [], total: 0 };
    const productCosts = baseResults[2].status === "fulfilled" ? baseResults[2].value : [];
    const pendingPOsCount = baseResults[3].status === "fulfilled" ? baseResults[3].value : 0;
    const totalProducts = baseResults[4].status === "fulfilled" ? baseResults[4].value : 0;

    if (baseResults[0].status === "rejected") {
      console.error("[dashboardServiceCompat] stock levels failed", baseResults[0].reason);
    }
    if (baseResults[1].status === "rejected") {
      console.error("[dashboardServiceCompat] movement history failed", baseResults[1].reason);
    }
    if (baseResults[2].status === "rejected") {
      console.error("[dashboardServiceCompat] product costs failed", baseResults[2].reason);
    }
    if (baseResults[3].status === "rejected") {
      console.error("[dashboardServiceCompat] pending PO count failed", baseResults[3].reason);
    }
    if (baseResults[4].status === "rejected") {
      console.error("[dashboardServiceCompat] total products count failed", baseResults[4].reason);
    }

    let sales: Array<{ report_date: Date; total: number }> = [];
    try {
      const hasTransactionDate = await hasColumn("sales", "transactionDate");
      const salesDateExpr = hasTransactionDate
        ? Prisma.sql`COALESCE(s."transactionDate", s."createdAt")`
        : Prisma.sql`s."createdAt"`;

      sales = await prisma.$queryRaw<Array<{ report_date: Date; total: number }>>`
        SELECT ${salesDateExpr} AS report_date, s.total::float8 AS total
        FROM sales s
        JOIN stores st ON st.id = s."storeId"
        WHERE st."orgId" = ${orgId}
          AND (${resolvedStoreId}::text IS NULL OR s."storeId" = ${resolvedStoreId})
          AND s.status::text IN ('COMPLETED', 'EXCHANGED', 'REFUNDED')
          ${startDate ? Prisma.sql`AND ${salesDateExpr} >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND ${salesDateExpr} < ((${endDate}::date + INTERVAL '1 day'))` : Prisma.empty}
        ORDER BY report_date ASC
      `;
    } catch (error) {
      console.error("[dashboardServiceCompat] failed to load sales history", error);
    }

    let returnTxns: Array<{ report_date: Date; net_amount: number; offset_amount: number; type: string }> = [];
    try {
      if (await hasTable("return_transactions")) {
        const [hasBusinessDate, hasTransactionDate, hasNetAmount, hasOffsetAmount, hasType] = await Promise.all([
          hasColumn("return_transactions", "businessDate"),
          hasColumn("return_transactions", "transactionDate"),
          hasColumn("return_transactions", "netAmount"),
          hasColumn("return_transactions", "offsetAmount"),
          hasColumn("return_transactions", "type"),
        ]);

        const returnDateExpr = hasBusinessDate
          ? Prisma.sql`COALESCE(rt."businessDate", rt."createdAt")`
          : hasTransactionDate
            ? Prisma.sql`COALESCE(rt."transactionDate", rt."createdAt")`
            : Prisma.sql`rt."createdAt"`;

        const netAmountExpr = hasNetAmount ? Prisma.sql`rt."netAmount"::float8` : Prisma.sql`0::float8`;
        const offsetAmountExpr = hasOffsetAmount ? Prisma.sql`rt."offsetAmount"::float8` : Prisma.sql`0::float8`;
        const typeExpr = hasType ? Prisma.sql`rt.type::text` : Prisma.sql`'RETURN'::text`;

        returnTxns = await prisma.$queryRaw<Array<{ report_date: Date; net_amount: number; offset_amount: number; type: string }>>`
          SELECT
            ${returnDateExpr} AS report_date,
            ${netAmountExpr} AS net_amount,
            ${offsetAmountExpr} AS offset_amount,
            ${typeExpr} AS type
          FROM return_transactions rt
          JOIN stores st ON st.id = rt."storeId"
          WHERE st."orgId" = ${orgId}
            AND (${resolvedStoreId}::text IS NULL OR rt."storeId" = ${resolvedStoreId})
            ${startDate ? Prisma.sql`AND ${returnDateExpr} >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND ${returnDateExpr} < ((${endDate}::date + INTERVAL '1 day'))` : Prisma.empty}
          ORDER BY report_date ASC
        `;
      }
    } catch (error) {
      console.error("[dashboardServiceCompat] failed to load return transactions", error);
    }

    const allStock = stockResult.items;
    const allMovements = movementsResult.items;

    const costPriceMap = new Map<string, number>();
    for (const p of productCosts) {
      costPriceMap.set(p.id, Number(p.costPrice));
    }

    const lowStockCount = allStock.filter((s) => s.status === "LOW" || s.status === "OUT").length;
    const totalStockValue = allStock.reduce((sum, row) => sum + row.quantity * (costPriceMap.get(row.productId) ?? 0), 0);

    const brandMap = new Map<string, number>();
    const categoryQuantityMap = new Map<string, number>();
    const categoryValueMap = new Map<string, number>();
    for (const row of allStock) {
      const value = row.quantity * (costPriceMap.get(row.productId) ?? 0);
      brandMap.set(row.brandName, (brandMap.get(row.brandName) ?? 0) + value);
      categoryQuantityMap.set(row.categoryName, (categoryQuantityMap.get(row.categoryName) ?? 0) + row.quantity);
      categoryValueMap.set(row.categoryName, (categoryValueMap.get(row.categoryName) ?? 0) + value);
    }

    const stockByCategory: StockByCategory[] = Array.from(categoryValueMap.entries())
      .map(([category, totalValue]) => ({
        category,
        totalQuantity: categoryQuantityMap.get(category) ?? 0,
        totalValue,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const topBrands: TopBrand[] = Array.from(brandMap.entries())
      .map(([brand, stockValue]) => ({ brand, stockValue }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const dayTotals = new Map<string, number>();
    const monthTotals = new Map<string, number>();
    const yearTotals = new Map<string, number>();

    for (const sale of sales) {
      const total = Number(sale.total);
      const saleDate = new Date(sale.report_date);
      const dayKey = formatDayKey(saleDate);
      const monthKey = formatMonthKey(saleDate);
      const yearKey = formatYearKey(saleDate);
      dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + total);
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + total);
      yearTotals.set(yearKey, (yearTotals.get(yearKey) ?? 0) + total);
    }

    for (const rt of returnTxns) {
      let revenueAmount = Number(rt.net_amount ?? 0);
      if (rt.type === "EXCHANGE") {
        revenueAmount = Number(rt.offset_amount ?? 0) + Number(rt.net_amount ?? 0);
      }

      const reportDate = new Date(rt.report_date);
      const dayKey = formatDayKey(reportDate);
      const monthKey = formatMonthKey(reportDate);
      const yearKey = formatYearKey(reportDate);
      dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + revenueAmount);
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + revenueAmount);
      yearTotals.set(yearKey, (yearTotals.get(yearKey) ?? 0) + revenueAmount);
    }

    const now = new Date();
    const revenueTrend: RevenueTrend = {
      day: buildRangePoints(
        14,
        (offset) => formatDayKey(shiftDays(now, offset)),
        (key) => {
          const [year, month, day] = key.split("-").map(Number);
          return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        },
        dayTotals
      ),
      month: buildRangePoints(
        12,
        (offset) => formatMonthKey(shiftMonths(now, offset)),
        (key) => {
          const [year, month] = key.split("-").map(Number);
          return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        },
        monthTotals
      ),
      year: buildRangePoints(
        5,
        (offset) => String(now.getUTCFullYear() + offset),
        (key) => key,
        yearTotals
      ),
    };

    const recentMovements: RecentMovement[] = allMovements.map((m) => ({
      id: m.id,
      productName: m.productName,
      sku: m.sku,
      categoryName: m.categoryName,
      sizeLabel: m.sizeLabel,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userName: m.userName,
      movementDate: m.movementDate,
      createdAt: m.createdAt,
    }));

    return {
      kpis: { totalProducts, totalStockValue, lowStockCount, pendingPOsCount },
      stockByCategory,
      topBrands,
      revenueTrend,
      recentMovements,
    };
  },
};
