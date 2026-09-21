import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type {
  AnalyticsPeriod,
  CategoryPerformanceRow,
  ComparableMetric,
  DiagnosticEvidenceGroup,
  InactivityBucket,
  InventoryDrilldownRow,
  InventoryIntelligenceResponse,
  InventoryTrendPoint,
  ProductSignalRow,
  SizeInsightRow,
} from "../types";
import {
  calculateChange,
  calculateCorrelation,
  calculateInventoryValue,
  calculateSellThrough,
  calculateStockoutDays,
  calculateStockCover,
  classifyInventoryPerformance,
  resolveSaleLineRevenue,
  reconstructStockSnapshot,
  summarizeTransactionEvents,
  type AnalyticsTransactionEvent,
} from "../utils/metrics";

const DAY_MS = 86_400_000;
const OFFSET_MS = 330 * 60_000;

const saleSelect = {
  transactionDate: true,
  items: {
    select: {
      productId: true,
      sizeId: true,
      quantity: true,
      total: true,
      netLineAmount: true,
      finalLineAmount: true,
      costPrice: true,
      product: {
        select: {
          name: true,
          sku: true,
          costPrice: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      },
      size: { select: { label: true } },
    },
  },
} satisfies Prisma.SaleSelect;

const returnSelect = {
  businessDate: true,
  items: {
    select: {
      returnedProductId: true,
      returnedSizeId: true,
      returnedQuantity: true,
      returnedUnitPrice: true,
      returnedLineAmount: true,
      newProductId: true,
      newSizeId: true,
      newQuantity: true,
      newUnitPrice: true,
      returnedProduct: {
        select: {
          name: true,
          sku: true,
          costPrice: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      },
      newProduct: {
        select: {
          name: true,
          sku: true,
          costPrice: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      },
      returnedSize: { select: { label: true } },
      newSize: { select: { label: true } },
    },
  },
  sale: {
    select: {
      items: { select: { productId: true, sizeId: true, costPrice: true } },
    },
  },
} satisfies Prisma.ReturnTransactionSelect;

type SaleRecord = Prisma.SaleGetPayload<{ select: typeof saleSelect }>;
type ReturnRecord = Prisma.ReturnTransactionGetPayload<{ select: typeof returnSelect }>;

type AggregateRow = {
  productId: string;
  product: string;
  sku: string;
  categoryId: string;
  category: string;
  brandId: string;
  brand: string;
  sizeId: string;
  size: string;
  revenue: number;
  units: number;
  cogs: number;
  costComplete: boolean;
};

type AggregateResult = {
  rows: Map<string, AggregateRow>;
  revenue: number;
  units: number;
  cogs: number;
  costComplete: boolean;
  grossMargin: number | null;
  averageRealizedPrice: number | null;
  salesByDay: Map<string, number>;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const variantKey = (productId: string, sizeId: string) => `${productId}:${sizeId}`;

const dayKey = (date: Date) => {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
};

const bucketKey = (date: Date, granularity: AnalyticsPeriod["granularity"]) => {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  if (granularity === "month") {
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "week") {
    const mondayOffset = (shifted.getUTCDay() + 6) % 7;
    return dayKey(new Date(date.getTime() - mondayOffset * DAY_MS));
  }
  return dayKey(date);
};

const comparable = (
  current: number | null,
  comparison: number | null,
  extra?: Pick<ComparableMetric, "state" | "note">
): ComparableMetric => ({
  current,
  comparison,
  change: calculateChange(current, comparison),
  ...extra,
});

function aggregateTransactions(sales: SaleRecord[], returns: ReturnRecord[]): AggregateResult {
  const rows = new Map<string, AggregateRow>();
  const salesByDay = new Map<string, number>();
  const events: AnalyticsTransactionEvent[] = [];

  const apply = (
    input: Omit<AggregateRow, "revenue" | "units" | "cogs" | "costComplete"> & {
      revenue: number;
      units: number;
      cost: number | null;
      date: Date;
    }
  ) => {
    const key = variantKey(input.productId, input.sizeId);
    const existing = rows.get(key) ?? {
      productId: input.productId,
      product: input.product,
      sku: input.sku,
      categoryId: input.categoryId,
      category: input.category,
      brandId: input.brandId,
      brand: input.brand,
      sizeId: input.sizeId,
      size: input.size,
      revenue: 0,
      units: 0,
      cogs: 0,
      costComplete: true,
    };
    existing.revenue += input.revenue;
    existing.units += input.units;
    if (input.cost === null) {
      existing.costComplete = false;
    } else {
      existing.cogs += input.cost;
    }
    rows.set(key, existing);
    events.push({ revenue: input.revenue, units: input.units, cost: input.cost });
    const keyDay = dayKey(input.date);
    salesByDay.set(keyDay, (salesByDay.get(keyDay) ?? 0) + input.units);
  };

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const lineRevenue = resolveSaleLineRevenue(
        item.finalLineAmount === null ? null : Number(item.finalLineAmount),
        item.netLineAmount === null ? null : Number(item.netLineAmount),
        Number(item.total)
      );
      apply({
        productId: item.productId,
        product: item.product.name,
        sku: item.product.sku,
        categoryId: item.product.category.id,
        category: item.product.category.name,
        brandId: item.product.brand.id,
        brand: item.product.brand.name,
        sizeId: item.sizeId,
        size: item.size.label,
        revenue: lineRevenue,
        units: item.quantity,
        cost: item.costPrice === null ? null : Number(item.costPrice) * item.quantity,
        date: sale.transactionDate,
      });
    });
  });

  returns.forEach((transaction) => {
    const originalCosts = new Map(
      transaction.sale.items.map((item) => [
        variantKey(item.productId, item.sizeId),
        item.costPrice === null ? null : Number(item.costPrice),
      ])
    );
    transaction.items.forEach((item) => {
      if (
        item.returnedProductId &&
        item.returnedSizeId &&
        item.returnedQuantity > 0 &&
        item.returnedProduct &&
        item.returnedSize
      ) {
        const unitCost = originalCosts.get(variantKey(item.returnedProductId, item.returnedSizeId));
        apply({
          productId: item.returnedProductId,
          product: item.returnedProduct.name,
          sku: item.returnedProduct.sku,
          categoryId: item.returnedProduct.category.id,
          category: item.returnedProduct.category.name,
          brandId: item.returnedProduct.brand.id,
          brand: item.returnedProduct.brand.name,
          sizeId: item.returnedSizeId,
          size: item.returnedSize.label,
          revenue: -Number(
            item.returnedLineAmount ?? Number(item.returnedUnitPrice) * item.returnedQuantity
          ),
          units: -item.returnedQuantity,
          cost: unitCost == null ? null : -unitCost * item.returnedQuantity,
          date: transaction.businessDate,
        });
      }
      if (
        item.newProductId &&
        item.newSizeId &&
        (item.newQuantity ?? 0) > 0 &&
        item.newProduct &&
        item.newSize
      ) {
        const quantity = item.newQuantity ?? 0;
        apply({
          productId: item.newProductId,
          product: item.newProduct.name,
          sku: item.newProduct.sku,
          categoryId: item.newProduct.category.id,
          category: item.newProduct.category.name,
          brandId: item.newProduct.brand.id,
          brand: item.newProduct.brand.name,
          sizeId: item.newSizeId,
          size: item.newSize.label,
          revenue: Number(item.newUnitPrice ?? 0) * quantity,
          units: quantity,
          cost: null,
          date: transaction.businessDate,
        });
      }
    });
  });

  return { rows, ...summarizeTransactionEvents(events), salesByDay };
}

export const INVENTORY_THRESHOLDS = {
  criticalCoverDays: 7,
  reorderCoverDays: 21,
  overstockCoverDays: 90,
  slowMovingDays: 60,
  deadStockDays: 180,
  highSellThrough: 60,
  materialStockoutDays: 2,
} as const;

export const inventoryIntelligenceService = {
  async getData(
    orgId: string,
    storeId: string,
    period: AnalyticsPeriod,
    options?: { drilldownCategoryId?: string }
  ): Promise<InventoryIntelligenceResponse> {
    const store = await prisma.store.findFirst({
      where: { id: storeId, orgId, isActive: true },
      select: { id: true },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");

    const currentStart = new Date(period.current.start);
    const currentEnd = new Date(period.current.end);
    const comparisonStart = new Date(period.comparison.start);
    const comparisonEnd = new Date(period.comparison.end);
    const earliest = new Date(Math.min(currentStart.getTime(), comparisonStart.getTime()));
    const now = new Date();
    const saleWhere = (start: Date, end: Date): Prisma.SaleWhereInput => ({
      storeId,
      status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
      transactionDate: { gte: start, lt: end },
      store: { orgId },
    });
    const returnWhere = (start: Date, end: Date): Prisma.ReturnTransactionWhereInput => ({
      storeId,
      businessDate: { gte: start, lt: end },
      store: { orgId },
    });

    const [
      currentSales,
      comparisonSales,
      currentReturns,
      comparisonReturns,
      stockEntries,
      movements,
      lastSales,
    ] = await Promise.all([
      prisma.sale.findMany({ where: saleWhere(currentStart, currentEnd), select: saleSelect }),
      prisma.sale.findMany({
        where: saleWhere(comparisonStart, comparisonEnd),
        select: saleSelect,
      }),
      prisma.returnTransaction.findMany({
        where: returnWhere(currentStart, currentEnd),
        select: returnSelect,
      }),
      prisma.returnTransaction.findMany({
        where: returnWhere(comparisonStart, comparisonEnd),
        select: returnSelect,
      }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId } },
        select: {
          productId: true,
          sizeId: true,
          quantity: true,
          product: {
            select: {
              name: true,
              sku: true,
              costPrice: true,
              category: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
            },
          },
          size: { select: { label: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: { storeId, movementDate: { gte: earliest, lte: now }, store: { orgId } },
        select: {
          productId: true,
          sizeId: true,
          type: true,
          quantity: true,
          movementDate: true,
          product: { select: { categoryId: true } },
        },
        orderBy: { movementDate: "asc" },
      }),
      prisma.stockMovement.groupBy({
        by: ["productId"],
        where: { storeId, type: "SALE", store: { orgId } },
        _max: { movementDate: true },
      }),
    ]);

    const current = aggregateTransactions(currentSales, currentReturns);
    const comparison = aggregateTransactions(comparisonSales, comparisonReturns);
    const stockHistoryReliable = !movements.some((movement) => movement.type === "ADJUSTMENT");
    const currentQuantities = new Map(
      stockEntries.map((entry) => [variantKey(entry.productId, entry.sizeId), entry.quantity])
    );
    const stockMeta = new Map(
      stockEntries.map((entry) => [
        variantKey(entry.productId, entry.sizeId),
        {
          productId: entry.productId,
          product: entry.product.name,
          sku: entry.product.sku,
          categoryId: entry.product.category.id,
          category: entry.product.category.name,
          brandId: entry.product.brand.id,
          brand: entry.product.brand.name,
          sizeId: entry.sizeId,
          size: entry.size.label,
          costPrice: Number(entry.product.costPrice),
        },
      ])
    );

    current.rows.forEach((row, key) => {
      if (!stockMeta.has(key)) {
        stockMeta.set(key, { ...row, costPrice: 0 });
        currentQuantities.set(key, 0);
      }
    });
    comparison.rows.forEach((row, key) => {
      if (!stockMeta.has(key)) {
        stockMeta.set(key, { ...row, costPrice: 0 });
        currentQuantities.set(key, 0);
      }
    });

    const reconstructableMovements = movements.map((movement) => ({
      key: variantKey(movement.productId, movement.sizeId),
      type: movement.type,
      quantity: movement.quantity,
      date: movement.movementDate,
    }));

    const snapshotCache = new Map<number, Map<string, number> | null>();
    const snapshotAt = (at: Date) => {
      const cacheKey = at.getTime();
      if (snapshotCache.has(cacheKey)) return snapshotCache.get(cacheKey) ?? null;
      const snapshot = reconstructStockSnapshot(currentQuantities, reconstructableMovements, at);
      snapshotCache.set(cacheKey, snapshot);
      return snapshot;
    };

    const sumSnapshot = (snapshot: Map<string, number> | null, categoryId?: string) => {
      if (!snapshot) return null;
      let total = 0;
      snapshot.forEach((quantity, key) => {
        if (!categoryId || stockMeta.get(key)?.categoryId === categoryId) total += quantity;
      });
      return total;
    };

    const inventoryValueAt = (snapshot: Map<string, number> | null) => {
      if (!snapshot) return null;
      return calculateInventoryValue(
        Array.from(snapshot.entries()).map(([key, quantity]) => ({
          quantity,
          unitCost: stockMeta.get(key)?.costPrice ?? 0,
        }))
      );
    };

    const currentOpening = snapshotAt(currentStart);
    const comparisonOpening = snapshotAt(comparisonStart);
    const comparisonClosing = snapshotAt(comparisonEnd);
    const inboundFor = (start: Date, end: Date, categoryId?: string) =>
      movements.reduce((total, movement) => {
        if (movement.movementDate < start || movement.movementDate >= end) return total;
        if (categoryId && movement.product.categoryId !== categoryId) return total;
        return movement.type === "IN" || movement.type === "RETURN"
          ? total + movement.quantity
          : total;
      }, 0);
    const currentStock = Array.from(currentQuantities.values()).reduce(
      (sum, quantity) => sum + quantity,
      0
    );
    const currentInventoryValue = inventoryValueAt(currentQuantities) ?? 0;
    const currentDays = Math.max(1, (currentEnd.getTime() - currentStart.getTime()) / DAY_MS);
    const comparisonDays = Math.max(
      1,
      (comparisonEnd.getTime() - comparisonStart.getTime()) / DAY_MS
    );
    const currentSellThrough = currentOpening
      ? calculateSellThrough(
          current.units,
          sumSnapshot(currentOpening) ?? 0,
          inboundFor(currentStart, currentEnd)
        )
      : null;
    const comparisonSellThrough = comparisonOpening
      ? calculateSellThrough(
          comparison.units,
          sumSnapshot(comparisonOpening) ?? 0,
          inboundFor(comparisonStart, comparisonEnd)
        )
      : null;
    const currentCover = calculateStockCover(currentStock, current.units, currentDays);
    const comparisonCover = calculateStockCover(
      sumSnapshot(comparisonClosing) ?? 0,
      comparison.units,
      comparisonDays
    );
    const currentGross = current.costComplete ? round(current.revenue - current.cogs) : null;
    const comparisonGross = comparison.costComplete
      ? round(comparison.revenue - comparison.cogs)
      : null;
    const currentMarginPct =
      currentGross !== null && current.revenue !== 0
        ? round((currentGross / current.revenue) * 100, 1)
        : null;
    const comparisonMarginPct =
      comparisonGross !== null && comparison.revenue !== 0
        ? round((comparisonGross / comparison.revenue) * 100, 1)
        : null;

    const bucketStarts: Date[] = [];
    const stepDays = period.granularity === "day" ? 1 : period.granularity === "week" ? 7 : 0;
    let cursor = new Date(currentStart);
    while (cursor < currentEnd) {
      bucketStarts.push(new Date(cursor));
      if (stepDays) cursor = new Date(cursor.getTime() + stepDays * DAY_MS);
      else {
        const shifted = new Date(cursor.getTime() + OFFSET_MS);
        cursor = new Date(
          Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1) - OFFSET_MS
        );
      }
    }
    const salesBuckets = new Map<string, number>();
    current.salesByDay.forEach((units, key) => {
      const date = new Date(`${key}T00:00:00.000+05:30`);
      const keyBucket = bucketKey(date, period.granularity);
      salesBuckets.set(keyBucket, (salesBuckets.get(keyBucket) ?? 0) + units);
    });
    const rawTrend = bucketStarts.map((start) => ({
      key: bucketKey(start, period.granularity),
      start,
      salesActual: salesBuckets.get(bucketKey(start, period.granularity)) ?? 0,
      inventoryActual: sumSnapshot(snapshotAt(start)),
    }));
    const baseSales = rawTrend.find((point) => point.salesActual > 0)?.salesActual ?? 0;
    const baseInventory =
      rawTrend.find((point) => (point.inventoryActual ?? 0) > 0)?.inventoryActual ?? 0;
    const trend: InventoryTrendPoint[] = rawTrend.map((point) => ({
      key: point.key,
      label: point.key,
      salesActual: point.salesActual,
      inventoryActual: point.inventoryActual,
      salesIndex: baseSales > 0 ? round((point.salesActual / baseSales) * 100, 1) : null,
      inventoryIndex:
        baseInventory && point.inventoryActual !== null
          ? round((point.inventoryActual / baseInventory) * 100, 1)
          : null,
    }));

    const categoryIds = new Set(Array.from(stockMeta.values()).map((meta) => meta.categoryId));
    const categoryPerformance: CategoryPerformanceRow[] = Array.from(categoryIds)
      .map((categoryId) => {
        const meta = Array.from(stockMeta.values()).find((item) => item.categoryId === categoryId)!;
        const currentRows = Array.from(current.rows.values()).filter(
          (row) => row.categoryId === categoryId
        );
        const comparisonRows = Array.from(comparison.rows.values()).filter(
          (row) => row.categoryId === categoryId
        );
        const revenue = round(currentRows.reduce((sum, row) => sum + row.revenue, 0));
        const comparisonRevenue = round(comparisonRows.reduce((sum, row) => sum + row.revenue, 0));
        const unitsSold = currentRows.reduce((sum, row) => sum + row.units, 0);
        const comparisonUnitsSold = comparisonRows.reduce((sum, row) => sum + row.units, 0);
        const categoryCurrentStock = Array.from(currentQuantities.entries()).reduce(
          (sum, [key, quantity]) =>
            sum + (stockMeta.get(key)?.categoryId === categoryId ? quantity : 0),
          0
        );
        const categoryInventoryValue = Array.from(currentQuantities.entries()).reduce(
          (sum, [key, quantity]) =>
            sum +
            (stockMeta.get(key)?.categoryId === categoryId
              ? Math.max(0, quantity) * (stockMeta.get(key)?.costPrice ?? 0)
              : 0),
          0
        );
        const categorySnapshots = bucketStarts
          .map((date) => sumSnapshot(snapshotAt(date), categoryId))
          .filter((value): value is number => value !== null);
        const comparisonSnapshotValues = [comparisonStart, comparisonEnd]
          .map((date) => sumSnapshot(snapshotAt(date), categoryId))
          .filter((value): value is number => value !== null);
        const averageStock = categorySnapshots.length
          ? round(categorySnapshots.reduce((a, b) => a + b, 0) / categorySnapshots.length)
          : null;
        const comparisonAverageStock = comparisonSnapshotValues.length
          ? round(
              comparisonSnapshotValues.reduce((a, b) => a + b, 0) / comparisonSnapshotValues.length
            )
          : null;
        const stockoutDays = stockHistoryReliable
          ? calculateStockoutDays(
              Array.from(
                { length: Math.ceil(currentDays) },
                (_, index) =>
                  sumSnapshot(
                    snapshotAt(new Date(currentStart.getTime() + index * DAY_MS)),
                    categoryId
                  ) ?? 0
              )
            )
          : null;
        const sellThrough = currentOpening
          ? calculateSellThrough(
              unitsSold,
              sumSnapshot(currentOpening, categoryId) ?? 0,
              inboundFor(currentStart, currentEnd, categoryId)
            )
          : null;
        const stockCoverDays = calculateStockCover(categoryCurrentStock, unitsSold, currentDays);
        const categoryGross = currentRows.every((row) => row.costComplete)
          ? round(currentRows.reduce((sum, row) => sum + row.revenue - row.cogs, 0))
          : null;
        const salesChange = calculateChange(revenue, comparisonRevenue);
        const stockChange = calculateChange(averageStock, comparisonAverageStock);
        return {
          categoryId,
          category: meta.category,
          revenue,
          comparisonRevenue,
          unitsSold,
          comparisonUnitsSold,
          salesChange,
          averageStock,
          comparisonAverageStock,
          stockChange,
          currentStock: categoryCurrentStock,
          inventoryValue: round(categoryInventoryValue),
          sellThrough,
          stockoutDays,
          stockCoverDays,
          grossMargin: categoryGross,
          diagnostic: classifyInventoryPerformance({
            salesChangePct: salesChange.percentage,
            stockChangePct: stockChange.percentage,
            sellThrough,
            stockCoverDays,
            stockoutDays,
            unitsSold,
          }),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const lastSaleByProduct = new Map(
      lastSales.map((row) => [row.productId, row._max.movementDate])
    );
    const productIds = new Set(Array.from(stockMeta.values()).map((meta) => meta.productId));
    const productSignals: ProductSignalRow[] = Array.from(productIds).map((productId) => {
      const variants = Array.from(stockMeta.entries()).filter(
        ([, meta]) => meta.productId === productId
      );
      const meta = variants[0][1];
      const unitsSold = Array.from(current.rows.values())
        .filter((row) => row.productId === productId)
        .reduce((sum, row) => sum + row.units, 0);
      const productCurrentStock = variants.reduce(
        (sum, [key]) => sum + (currentQuantities.get(key) ?? 0),
        0
      );
      const inventoryValue = variants.reduce(
        (sum, [key, item]) => sum + Math.max(0, currentQuantities.get(key) ?? 0) * item.costPrice,
        0
      );
      const opening = currentOpening
        ? variants.reduce((sum, [key]) => sum + (currentOpening.get(key) ?? 0), 0)
        : null;
      const inbound = movements.reduce(
        (sum, movement) =>
          movement.productId === productId &&
          movement.movementDate >= currentStart &&
          movement.movementDate < currentEnd &&
          (movement.type === "IN" || movement.type === "RETURN")
            ? sum + movement.quantity
            : sum,
        0
      );
      const sellThrough =
        opening === null ? null : calculateSellThrough(unitsSold, opening, inbound);
      const stockCoverDays = calculateStockCover(productCurrentStock, unitsSold, currentDays);
      const stockoutDays = stockHistoryReliable
        ? calculateStockoutDays(
            Array.from({ length: Math.ceil(currentDays) }, (_, index) => {
              const snapshot = snapshotAt(new Date(currentStart.getTime() + index * DAY_MS));
              return variants.reduce((sum, [key]) => sum + (snapshot?.get(key) ?? 0), 0);
            })
          )
        : null;
      const lastSale = lastSaleByProduct.get(productId);
      const daysSinceSale = lastSale
        ? Math.max(0, Math.floor((now.getTime() - lastSale.getTime()) / DAY_MS))
        : null;
      let status: ProductSignalRow["status"] = "Healthy";
      if (productCurrentStock <= 0 && unitsSold > 0) status = "Critical";
      else if (stockCoverDays !== null && stockCoverDays <= INVENTORY_THRESHOLDS.criticalCoverDays)
        status = "Critical";
      else if (stockCoverDays !== null && stockCoverDays <= INVENTORY_THRESHOLDS.reorderCoverDays)
        status = "Reorder soon";
      else if (daysSinceSale === null && productCurrentStock > 0) status = "Dead stock candidate";
      else if ((daysSinceSale ?? 0) >= INVENTORY_THRESHOLDS.deadStockDays)
        status = "Dead stock candidate";
      else if ((daysSinceSale ?? 0) >= INVENTORY_THRESHOLDS.slowMovingDays) status = "Slow moving";
      else if (stockCoverDays !== null && stockCoverDays >= INVENTORY_THRESHOLDS.overstockCoverDays)
        status = "Overstock risk";
      const priorityScore = round(
        (Math.max(0, unitsSold) / currentDays) * 10 +
          (sellThrough ?? 0) / 10 +
          (stockoutDays ?? 0) * 3 +
          (stockCoverDays !== null && stockCoverDays <= INVENTORY_THRESHOLDS.reorderCoverDays
            ? INVENTORY_THRESHOLDS.reorderCoverDays - stockCoverDays
            : 0),
        1
      );
      return {
        productId,
        product: meta.product,
        sku: meta.sku,
        categoryId: meta.categoryId,
        category: meta.category,
        brandId: meta.brandId,
        brand: meta.brand,
        unitsSold,
        currentStock: productCurrentStock,
        inventoryValue: round(inventoryValue),
        sellThrough,
        stockCoverDays,
        stockoutDays,
        daysSinceSale,
        priorityScore,
        status,
      };
    });

    const highDemandLowStock = productSignals
      .filter(
        (row) => row.unitsSold > 0 && (row.status === "Critical" || row.status === "Reorder soon")
      )
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10);
    const overstock = productSignals
      .filter((row) =>
        ["Overstock risk", "Slow moving", "Dead stock candidate"].includes(row.status)
      )
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 10);
    const replenishment = productSignals
      .filter(
        (row) =>
          row.unitsSold > 0 &&
          (row.status === "Critical" ||
            row.status === "Reorder soon" ||
            (row.sellThrough ?? 0) >= INVENTORY_THRESHOLDS.highSellThrough ||
            (row.stockoutDays ?? 0) >= INVENTORY_THRESHOLDS.materialStockoutDays)
      )
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10);

    const currentSizeRows = Array.from(current.rows.values());
    const totalPositiveUnits = currentSizeRows.reduce(
      (sum, row) => sum + Math.max(0, row.units),
      0
    );
    const sizeMap = new Map<string, SizeInsightRow>();
    Array.from(stockMeta.entries()).forEach(([key, meta]) => {
      const sold = current.rows.get(key)?.units ?? 0;
      const quantity = currentQuantities.get(key) ?? 0;
      const existing = sizeMap.get(meta.sizeId) ?? {
        sizeId: meta.sizeId,
        size: meta.size,
        unitsSold: 0,
        demandShare: 0,
        currentStock: 0,
        stockoutDays: stockHistoryReliable ? 0 : null,
        sellThrough: null,
        availability: stockHistoryReliable ? 0 : null,
        status: "Healthy" as const,
      };
      existing.unitsSold += sold;
      existing.currentStock += quantity;
      sizeMap.set(meta.sizeId, existing);
    });
    const sizeInsights = Array.from(sizeMap.values())
      .map((row) => {
        const demandShare =
          totalPositiveUnits > 0
            ? round((Math.max(0, row.unitsSold) / totalPositiveUnits) * 100, 1)
            : 0;
        const dailySizeStock = stockHistoryReliable
          ? Array.from({ length: Math.ceil(currentDays) }, (_, index) => {
              const snapshot = snapshotAt(new Date(currentStart.getTime() + index * DAY_MS));
              return Array.from(stockMeta.entries()).reduce(
                (sum, [key, meta]) =>
                  sum + (meta.sizeId === row.sizeId ? (snapshot?.get(key) ?? 0) : 0),
                0
              );
            })
          : null;
        const stockoutDays = calculateStockoutDays(dailySizeStock);
        const sizeVariantKeys = Array.from(stockMeta.entries())
          .filter(([, meta]) => meta.sizeId === row.sizeId)
          .map(([key]) => key);
        const sizeOpening = currentOpening
          ? sizeVariantKeys.reduce((sum, key) => sum + (currentOpening.get(key) ?? 0), 0)
          : null;
        const sizeInbound = movements.reduce(
          (sum, movement) =>
            movement.sizeId === row.sizeId &&
            movement.movementDate >= currentStart &&
            movement.movementDate < currentEnd &&
            (movement.type === "IN" || movement.type === "RETURN")
              ? sum + movement.quantity
              : sum,
          0
        );
        const sellThrough =
          sizeOpening === null
            ? null
            : calculateSellThrough(row.unitsSold, sizeOpening, sizeInbound);
        const availability = dailySizeStock?.length
          ? round(((dailySizeStock.length - (stockoutDays ?? 0)) / dailySizeStock.length) * 100, 1)
          : null;
        let status: SizeInsightRow["status"] = "Healthy";
        if (row.currentStock <= 0 && demandShare >= 10) status = "Out of stock";
        else if (
          row.currentStock <= Math.max(2, (row.unitsSold / Math.max(1, currentDays)) * 7) &&
          demandShare >= 10
        )
          status = "Critical";
        else if (demandShare < 2) status = "Low demand";
        else if (row.currentStock < 5) status = "Low";
        return { ...row, demandShare, stockoutDays, sellThrough, availability, status };
      })
      .sort((a, b) => b.demandShare - a.demandShare);
    const sizeAvailabilityScore =
      totalPositiveUnits > 0 && stockHistoryReliable
        ? Math.min(
            100,
            round(
              sizeInsights.reduce(
                (score, row) => score + row.demandShare * ((row.availability ?? 0) / 100),
                0
              ),
              1
            )
          )
        : null;

    const drilldown: InventoryDrilldownRow[] = Array.from(stockMeta.entries())
      .filter(([, meta]) => meta.categoryId === options?.drilldownCategoryId)
      .map(([key, meta]) => {
        const sales = current.rows.get(key);
        const comparisonSales = comparison.rows.get(key);
        const unitsSold = sales?.units ?? 0;
        const comparisonUnitsSold = comparisonSales?.units ?? 0;
        const currentStock = currentQuantities.get(key) ?? 0;
        const openingStock = currentOpening?.get(key) ?? null;
        const inbound = movements.reduce(
          (sum, movement) =>
            movement.productId === meta.productId &&
            movement.sizeId === meta.sizeId &&
            movement.movementDate >= currentStart &&
            movement.movementDate < currentEnd &&
            (movement.type === "IN" || movement.type === "RETURN")
              ? sum + movement.quantity
              : sum,
          0
        );
        const dailyStock = stockHistoryReliable
          ? Array.from(
              { length: Math.ceil(currentDays) },
              (_, index) =>
                snapshotAt(new Date(currentStart.getTime() + index * DAY_MS))?.get(key) ?? 0
            )
          : null;
        const stockSamples = bucketStarts
          .map((date) => snapshotAt(date)?.get(key) ?? null)
          .filter((quantity): quantity is number => quantity !== null);
        const comparisonStockSamples = [comparisonStart, comparisonEnd]
          .map((date) => snapshotAt(date)?.get(key) ?? null)
          .filter((quantity): quantity is number => quantity !== null);
        const averageStock = stockSamples.length
          ? round(stockSamples.reduce((sum, quantity) => sum + quantity, 0) / stockSamples.length)
          : null;
        const comparisonAverageStock = comparisonStockSamples.length
          ? round(
              comparisonStockSamples.reduce((sum, quantity) => sum + quantity, 0) /
                comparisonStockSamples.length
            )
          : null;
        return {
          categoryId: meta.categoryId,
          category: meta.category,
          brandId: meta.brandId,
          brand: meta.brand,
          productId: meta.productId,
          product: meta.product,
          sku: meta.sku,
          sizeId: meta.sizeId,
          size: meta.size,
          revenue: round(sales?.revenue ?? 0),
          comparisonRevenue: round(comparisonSales?.revenue ?? 0),
          revenueChange: calculateChange(sales?.revenue ?? 0, comparisonSales?.revenue ?? 0),
          unitsSold,
          comparisonUnitsSold,
          grossMargin: sales?.costComplete
            ? round((sales?.revenue ?? 0) - (sales?.cogs ?? 0))
            : null,
          averageStock,
          comparisonAverageStock,
          stockChange: calculateChange(averageStock, comparisonAverageStock),
          currentStock,
          inventoryValue: round(Math.max(0, currentStock) * meta.costPrice),
          sellThrough:
            openingStock === null ? null : calculateSellThrough(unitsSold, openingStock, inbound),
          stockCoverDays: calculateStockCover(currentStock, unitsSold, currentDays),
          stockoutDays: calculateStockoutDays(dailyStock),
        };
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.brand.localeCompare(b.brand) ||
          a.product.localeCompare(b.product) ||
          a.size.localeCompare(b.size)
      );

    const inactivityLabels: InactivityBucket["label"][] = [
      "0–30 days",
      "31–60 days",
      "61–90 days",
      "91–180 days",
      "180+ days",
      "Never sold",
    ];
    const inactivity = inactivityLabels.map((label) => ({
      label,
      units: 0,
      costValue: 0,
      percentage: 0,
    }));
    productSignals.forEach((row) => {
      const index =
        row.daysSinceSale === null
          ? 5
          : row.daysSinceSale <= 30
            ? 0
            : row.daysSinceSale <= 60
              ? 1
              : row.daysSinceSale <= 90
                ? 2
                : row.daysSinceSale <= 180
                  ? 3
                  : 4;
      inactivity[index].units += row.currentStock;
      inactivity[index].costValue += row.inventoryValue;
    });
    inactivity.forEach((bucket) => {
      bucket.costValue = round(bucket.costValue);
      bucket.percentage =
        currentInventoryValue > 0 ? round((bucket.costValue / currentInventoryValue) * 100, 1) : 0;
    });

    const overallSalesChange = calculateChange(current.revenue, comparison.revenue);
    const overallStockChange = calculateChange(currentStock, sumSnapshot(comparisonClosing));
    const diagnostics = classifyInventoryPerformance({
      salesChangePct: overallSalesChange.percentage,
      stockChangePct: overallStockChange.percentage,
      sellThrough: currentSellThrough,
      stockCoverDays: currentCover,
      stockoutDays: null,
      unitsSold: current.units,
    });
    const formatChangeSignal = (label: string, change: ReturnType<typeof calculateChange>) => {
      if (change.state === "new") return `${label}: new activity`;
      if (change.percentage === null) return `${label}: comparison unavailable`;
      const sign = change.percentage > 0 ? "+" : "";
      return `${label}: ${sign}${change.percentage}%`;
    };
    const currentProductRevenue = new Map<string, number>();
    current.rows.forEach((row) =>
      currentProductRevenue.set(
        row.productId,
        (currentProductRevenue.get(row.productId) ?? 0) + row.revenue
      )
    );
    const comparisonProductRevenue = new Map<string, number>();
    comparison.rows.forEach((row) =>
      comparisonProductRevenue.set(
        row.productId,
        (comparisonProductRevenue.get(row.productId) ?? 0) + row.revenue
      )
    );
    const topProductShare = (revenues: Map<string, number>, total: number) =>
      total > 0
        ? round(
            (Array.from(revenues.values())
              .sort((a, b) => b - a)
              .slice(0, 5)
              .reduce((sum, value) => sum + Math.max(0, value), 0) /
              total) *
              100,
            1
          )
        : null;
    const currentTopShare = topProductShare(currentProductRevenue, current.revenue);
    const comparisonTopShare = topProductShare(comparisonProductRevenue, comparison.revenue);
    const priceChange = calculateChange(
      current.averageRealizedPrice,
      comparison.averageRealizedPrice
    );
    const topShareChange = calculateChange(currentTopShare, comparisonTopShare);
    const atRiskInventoryValue = overstock.reduce((sum, row) => sum + row.inventoryValue, 0);
    const diagnosticEvidence: DiagnosticEvidenceGroup[] = [
      {
        key: "inventory",
        title: "Inventory Availability",
        state: stockHistoryReliable ? "available" : "unavailable",
        signals: [
          formatChangeSignal("Period-end stock", overallStockChange),
          currentSellThrough === null
            ? "Sell-through unavailable"
            : `Sell-through: ${currentSellThrough}%`,
          currentCover === null ? "Stock cover unavailable" : `Stock cover: ${currentCover} days`,
        ],
        note: stockHistoryReliable
          ? undefined
          : "Signed adjustment direction is not retained in StockMovement records.",
      },
      {
        key: "demand",
        title: "Demand",
        state: "available",
        signals: [
          formatChangeSignal("Revenue", overallSalesChange),
          formatChangeSignal("Net units", calculateChange(current.units, comparison.units)),
        ],
      },
      {
        key: "lostDemand",
        title: "Walk-In / Lost Demand",
        state: "unavailable",
        signals: [],
        note: "No visitor-interest or non-conversion records exist in the current data model.",
      },
      {
        key: "pricing",
        title: "Pricing",
        state:
          current.averageRealizedPrice === null || comparison.averageRealizedPrice === null
            ? "unavailable"
            : "available",
        signals:
          current.averageRealizedPrice === null || comparison.averageRealizedPrice === null
            ? []
            : [
                formatChangeSignal("Average realized selling price", priceChange),
                `Current average: ₹${current.averageRealizedPrice.toLocaleString("en-IN")}`,
              ],
        note:
          current.averageRealizedPrice === null || comparison.averageRealizedPrice === null
            ? "A positive net-unit denominator is required."
            : "Calculated from historical net item revenue divided by net units.",
      },
      {
        key: "productMix",
        title: "Product Mix",
        state:
          currentTopShare === null || comparisonTopShare === null ? "unavailable" : "available",
        signals:
          currentTopShare === null || comparisonTopShare === null
            ? []
            : [
                `Top five products: ${currentTopShare}% of revenue`,
                formatChangeSignal("Top-five concentration", topShareChange),
                currentInventoryValue > 0
                  ? `${round((atRiskInventoryValue / currentInventoryValue) * 100, 1)}% of inventory value is flagged slow-moving or overstocked`
                  : "No current inventory value",
              ],
        note: "Concentration is based on net item revenue, not current catalogue prices.",
      },
    ];
    const correlationValue = stockHistoryReliable
      ? calculateCorrelation(
          trend.map((point) => point.inventoryActual ?? 0),
          trend.map((point) => point.salesActual)
        )
      : null;

    return {
      range: period,
      generatedAt: now.toISOString(),
      methodology: {
        revenue:
          "Net item revenue using sale pricing snapshots, less dated returns, plus exchanged items.",
        inventoryValue: "Current sellable quantity multiplied by product cost price.",
        sellThrough: "Net units sold divided by reconstructed opening stock plus inbound units.",
        stockCover:
          "Current sellable quantity divided by average daily net unit sales in the selected period.",
        stockHistoryReliable,
        stockHistoryNote: stockHistoryReliable
          ? null
          : "Exact historical stock is unavailable because ADJUSTMENT movements do not retain their direction.",
        grossMarginReliable: current.costComplete && comparison.costComplete,
        lostDemandAvailable: false,
      },
      kpis: {
        revenue: comparable(current.revenue, comparison.revenue),
        unitsSold: comparable(current.units, comparison.units),
        grossMargin: comparable(
          currentGross,
          comparisonGross,
          currentGross === null
            ? { state: "unavailable", note: "Some transactions lack historical cost snapshots." }
            : undefined
        ),
        grossMarginPercent: comparable(currentMarginPct, comparisonMarginPct),
        inventoryValue: comparable(currentInventoryValue, inventoryValueAt(comparisonClosing)),
        sellThrough: comparable(
          currentSellThrough,
          comparisonSellThrough,
          currentSellThrough === null
            ? {
                state: "unavailable",
                note: "Historical stock could not be reconstructed reliably.",
              }
            : undefined
        ),
        stockCover: comparable(
          currentCover,
          comparisonCover,
          currentCover === null
            ? {
                state: current.units <= 0 ? "noSales" : "unavailable",
                note: current.units <= 0 ? "No recent sales" : undefined,
              }
            : undefined
        ),
        averageRealizedPrice: comparable(
          current.averageRealizedPrice,
          comparison.averageRealizedPrice,
          current.averageRealizedPrice === null
            ? { state: "unavailable", note: "Positive net units are required." }
            : undefined
        ),
      },
      trend,
      correlation:
        correlationValue === null
          ? null
          : {
              coefficient: correlationValue,
              observationCount: trend.length,
              description: `${Math.abs(correlationValue) >= 0.7 ? "Strong" : Math.abs(correlationValue) >= 0.4 ? "Moderate" : "Weak"} association; correlation does not establish causation.`,
            },
      categoryPerformance,
      drilldown,
      highDemandLowStock,
      overstock,
      sizeInsights,
      sizeAvailabilityScore,
      inactivity,
      replenishment,
      diagnostics,
      diagnosticEvidence,
      lostDemand: null,
    };
  },
};
