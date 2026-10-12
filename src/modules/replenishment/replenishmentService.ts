import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allocateMoney } from "@/modules/analytics/utils/canonicalMetrics";
import { businessDateForInstant } from "@/modules/analytics/utils/dateRange";
import { resolveSaleLineRevenue } from "@/modules/inventory-intelligence/utils/metrics";
import { businessDaysBetween } from "@/modules/procurement-intelligence/procurementRules";
import {
  calculateReplenishment,
  REPLENISHMENT_POLICY,
  type InboundEvidence,
  type LeadTimeSource,
  type ReplenishmentInput,
} from "./replenishmentPolicy";
import { forecastAwareRequirement, forecastStockout } from "@/modules/forecasting/forecastRules";

const n = (value: unknown) => Number(value ?? 0);
const variant = (productId: string, sizeId: string) => `${productId}:${sizeId}`;
const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const replenishmentService = {
  async get(
    orgId: string,
    storeId: string,
    from: Date,
    endExclusive: Date,
    query: {
      page?: number;
      pageSize?: number;
      categoryId?: string;
      brandId?: string;
      action?: string;
      supplierId?: string;
    } = {}
  ) {
    const historyStart = new Date(endExclusive.getTime() - 365 * 86_400_000);
    const latestForecastSnapshot = await prisma.demandForecast.findFirst({
      where: { orgId, storeId, horizonDays: 30 },
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true },
    });
    const [
      store,
      stock,
      sales,
      returns,
      demands,
      openItems,
      transferItems,
      receiptEvidence,
      lastSales,
      ambiguousAdjustments,
      forecasts,
    ] = await Promise.all([
      prisma.store.findFirstOrThrow({
        where: { id: storeId, orgId },
        select: { id: true, name: true },
      }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId } },
        select: {
          productId: true,
          sizeId: true,
          quantity: true,
          reorderLevel: true,
          reorderQuantity: true,
          size: { select: { label: true } },
          product: {
            select: {
              name: true,
              sku: true,
              isActive: true,
              createdAt: true,
              costPrice: true,
              category: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
              productSuppliers: {
                where: { isActive: true },
                select: {
                  supplierId: true,
                  isDefault: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          storeId,
          store: { orgId },
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { gte: from, lt: endExclusive },
        },
        select: {
          id: true,
          transactionDate: true,
          items: {
            select: {
              productId: true,
              sizeId: true,
              quantity: true,
              total: true,
              finalLineAmount: true,
              netLineAmount: true,
              costPrice: true,
            },
          },
        },
      }),
      prisma.returnTransaction.findMany({
        where: { storeId, store: { orgId }, businessDate: { gte: from, lt: endExclusive } },
        select: {
          finalPayable: true,
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
              newCostPrice: true,
            },
          },
          sale: {
            select: { items: { select: { productId: true, sizeId: true, costPrice: true } } },
          },
        },
      }),
      prisma.demandRequest.findMany({
        where: {
          storeId,
          orgId,
          createdAt: { gte: from, lt: endExclusive },
          status: { in: ["UNFULFILLED", "PARTIALLY_FULFILLED"] },
        },
        select: {
          productId: true,
          requestedQuantity: true,
          fulfilledQuantity: true,
          attributes: true,
        },
      }),
      prisma.purchaseOrderItem.findMany({
        where: {
          purchaseOrder: {
            storeId,
            store: { orgId },
            status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] },
          },
        },
        select: {
          id: true,
          productId: true,
          sizeId: true,
          quantity: true,
          purchaseOrder: {
            select: {
              id: true,
              supplierId: true,
              supplier: { select: { name: true } },
              expectedDeliveryDate: true,
            },
          },
          receiptItems: { select: { quantityAccepted: true } },
        },
      }),
      prisma.stockTransferItem.findMany({
        where: {
          transfer: {
            orgId,
            destinationStoreId: storeId,
            status: { in: ["DISPATCHED", "PARTIALLY_RECEIVED"] },
          },
        },
        select: {
          productId: true,
          sizeId: true,
          dispatchedQuantity: true,
          receivedQuantity: true,
          damagedQuantity: true,
          transfer: { select: { expectedArrivalAt: true } },
        },
      }),
      prisma.purchaseOrderReceiptItem.findMany({
        where: {
          receipt: {
            purchaseOrder: { storeId, store: { orgId }, orderedAt: { not: null } },
            receivedAt: { gte: historyStart, lt: endExclusive },
          },
        },
        select: {
          productId: true,
          sizeId: true,
          receipt: {
            select: {
              receivedAt: true,
              purchaseOrder: { select: { supplierId: true, orderedAt: true } },
            },
          },
        },
      }),
      prisma.stockMovement.groupBy({
        by: ["productId", "sizeId"],
        where: { storeId, store: { orgId }, type: "SALE" },
        _max: { movementDate: true },
      }),
      prisma.stockMovement.count({
        where: {
          storeId,
          store: { orgId },
          type: "ADJUSTMENT",
          deltaQuantity: null,
          movementDate: { gte: from, lt: endExclusive },
        },
      }),
      prisma.demandForecast.findMany({
        where: {
          orgId,
          storeId,
          horizonDays: 30,
          snapshotDate: latestForecastSnapshot?.snapshotDate ?? new Date(0),
          readiness: { in: ["READY", "LIMITED"] },
        },
        select: {
          productId: true,
          sizeId: true,
          expectedQuantity: true,
          lowerBound: true,
          upperBound: true,
          evidenceQuality: true,
          method: true,
          snapshotDate: true,
          evaluation: true,
        },
        orderBy: { snapshotDate: "desc" },
      }),
    ]);
    const activeDays = new Set(sales.map((sale) => businessDateForInstant(sale.transactionDate)))
      .size;
    const observationDays = Math.max(
      1,
      Math.ceil((endExclusive.getTime() - from.getTime()) / 86_400_000)
    );
    const financial = new Map<
      string,
      { units: number; revenue: number; cogs: number; costComplete: boolean }
    >();
    const transferInbound = new Map<string, InboundEvidence[]>();
    const getFinancial = (key: string) => {
      const value = financial.get(key) ?? { units: 0, revenue: 0, cogs: 0, costComplete: true };
      financial.set(key, value);
      return value;
    };
    for (const sale of sales)
      for (const item of sale.items) {
        const row = getFinancial(variant(item.productId, item.sizeId));
        row.units += item.quantity;
        row.revenue += resolveSaleLineRevenue(
          item.finalLineAmount === null ? null : n(item.finalLineAmount),
          item.netLineAmount === null ? null : n(item.netLineAmount),
          n(item.total)
        );
        if (item.costPrice === null) row.costComplete = false;
        else row.cogs += n(item.costPrice) * item.quantity;
      }
    for (const transaction of returns) {
      const original = new Map(
        transaction.sale.items.map((item) => [
          variant(item.productId, item.sizeId),
          item.costPrice === null ? null : n(item.costPrice),
        ])
      );
      const replacementItems = transaction.items.filter(
        (item) => item.newProductId && item.newSizeId && (item.newQuantity ?? 0) > 0
      );
      const replacementRevenue = allocateMoney(
        transaction.finalPayable,
        replacementItems.map((item) => n(item.newUnitPrice) * (item.newQuantity ?? 0))
      );
      let replacementIndex = 0;
      for (const item of transaction.items) {
        if (item.returnedProductId && item.returnedSizeId) {
          const row = getFinancial(variant(item.returnedProductId, item.returnedSizeId));
          const cost = original.get(variant(item.returnedProductId, item.returnedSizeId));
          row.units -= item.returnedQuantity;
          row.revenue -= n(
            item.returnedLineAmount ?? n(item.returnedUnitPrice) * item.returnedQuantity
          );
          if (cost === null || cost === undefined) row.costComplete = false;
          else row.cogs -= cost * item.returnedQuantity;
        }
        if (item.newProductId && item.newSizeId && (item.newQuantity ?? 0) > 0) {
          const row = getFinancial(variant(item.newProductId, item.newSizeId));
          row.units += item.newQuantity ?? 0;
          row.revenue += replacementRevenue[replacementIndex++] ?? 0;
          if (item.newCostPrice === null) row.costComplete = false;
          else row.cogs += n(item.newCostPrice) * n(item.newQuantity);
        }
      }
    }
    const inbound = new Map<
      string,
      Array<{
        quantity: number;
        expectedInDays: number | null;
        expectedDate: string | null;
        overdue: boolean;
        supplierId: string;
        supplier: string;
        poId: string;
      }>
    >();
    const today = new Date();
    const todayKey = businessDateForInstant(today);
    for (const item of openItems) {
      if (!item.productId || !item.sizeId) continue;
      const accepted = item.receiptItems.reduce(
        (sum, receipt) => sum + receipt.quantityAccepted,
        0
      );
      const quantity = Math.max(0, item.quantity - accepted);
      if (!quantity) continue;
      const expectedDate =
        item.purchaseOrder.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null;
      const expectedInDays = item.purchaseOrder.expectedDeliveryDate
        ? businessDaysBetween(today, item.purchaseOrder.expectedDeliveryDate)
        : null;
      const key = variant(item.productId, item.sizeId);
      inbound.set(key, [
        ...(inbound.get(key) ?? []),
        {
          quantity,
          expectedInDays,
          expectedDate,
          overdue: Boolean(expectedDate && expectedDate < todayKey),
          supplierId: item.purchaseOrder.supplierId,
          supplier: item.purchaseOrder.supplier.name,
          poId: item.purchaseOrder.id,
        },
      ]);
    }
    for (const item of transferItems) {
      const quantity = Math.max(
        0,
        item.dispatchedQuantity - item.receivedQuantity - item.damagedQuantity
      );
      if (!quantity) continue;
      const expectedDate = item.transfer.expectedArrivalAt?.toISOString().slice(0, 10) ?? null;
      const row: InboundEvidence = {
        quantity,
        expectedInDays: item.transfer.expectedArrivalAt
          ? businessDaysBetween(today, item.transfer.expectedArrivalAt)
          : null,
        expectedDate,
        overdue: Boolean(expectedDate && expectedDate < todayKey),
      };
      const key = variant(item.productId, item.sizeId);
      transferInbound.set(key, [...(transferInbound.get(key) ?? []), row]);
    }
    const productLead = new Map<string, number[]>();
    const supplierLead = new Map<string, number[]>();
    for (const evidence of receiptEvidence) {
      const orderedAt = evidence.receipt.purchaseOrder.orderedAt;
      if (!orderedAt) continue;
      const days = Math.max(0, businessDaysBetween(orderedAt, evidence.receipt.receivedAt));
      const productKey = `${evidence.receipt.purchaseOrder.supplierId}:${evidence.productId}`;
      productLead.set(productKey, [...(productLead.get(productKey) ?? []), days]);
      supplierLead.set(evidence.receipt.purchaseOrder.supplierId, [
        ...(supplierLead.get(evidence.receipt.purchaseOrder.supplierId) ?? []),
        days,
      ]);
    }
    const lastSaleMap = new Map(
      lastSales.map((row) => [variant(row.productId, row.sizeId), row._max.movementDate])
    );
    const latestForecast = new Map<string, (typeof forecasts)[number]>();
    for (const forecast of forecasts) {
      const forecastKey = variant(forecast.productId, forecast.sizeId);
      if (!latestForecast.has(forecastKey)) latestForecast.set(forecastKey, forecast);
    }
    const specificDemand = new Map<string, number>();
    const productDemand = new Map<string, number>();
    for (const request of demands) {
      if (!request.productId) continue;
      const unfulfilled = Math.max(0, request.requestedQuantity - request.fulfilledQuantity);
      const attributes = request.attributes as Record<string, unknown>;
      const sizeId = typeof attributes.sizeId === "string" ? attributes.sizeId : null;
      if (sizeId)
        specificDemand.set(
          variant(request.productId, sizeId),
          (specificDemand.get(variant(request.productId, sizeId)) ?? 0) + unfulfilled
        );
      else
        productDemand.set(
          request.productId,
          (productDemand.get(request.productId) ?? 0) + unfulfilled
        );
    }
    const stockByProduct = new Map<string, typeof stock>();
    for (const entry of stock)
      stockByProduct.set(entry.productId, [...(stockByProduct.get(entry.productId) ?? []), entry]);
    for (const [productId, demand] of productDemand) {
      const candidates = (stockByProduct.get(productId) ?? []).toSorted(
        (a, b) => a.quantity - b.quantity
      );
      if (candidates[0])
        specificDemand.set(
          variant(productId, candidates[0].sizeId),
          (specificDemand.get(variant(productId, candidates[0].sizeId)) ?? 0) + demand
        );
    }
    const rows = stock.map((entry) => {
      const key = variant(entry.productId, entry.sizeId);
      const f = financial.get(key) ?? { units: 0, revenue: 0, cogs: 0, costComplete: true };
      const inboundRows = inbound.get(key) ?? [];
      const allInboundRows = [...inboundRows, ...(transferInbound.get(key) ?? [])];
      const preferred = inboundRows[0]
        ? { supplierId: inboundRows[0].supplierId, supplier: inboundRows[0].supplier }
        : (entry.product.productSuppliers.find((link) => link.isDefault) ??
          entry.product.productSuppliers[0] ??
          null);
      const productSamples = preferred
        ? (productLead.get(`${preferred.supplierId}:${entry.productId}`) ?? [])
        : [];
      const supplierSamples = preferred ? (supplierLead.get(preferred.supplierId) ?? []) : [];
      let leadTimeDays: number = REPLENISHMENT_POLICY.fallbackLeadTimeDays;
      let leadTimeSource: LeadTimeSource = "FALLBACK";
      let leadTimeSamples = 0;
      if (productSamples.length) {
        leadTimeDays = Math.max(1, Math.round(median(productSamples)));
        leadTimeSource = "SUPPLIER_PRODUCT";
        leadTimeSamples = productSamples.length;
      } else if (supplierSamples.length) {
        leadTimeDays = Math.max(1, Math.round(median(supplierSamples)));
        leadTimeSource = "SUPPLIER";
        leadTimeSamples = supplierSamples.length;
      }
      const grossProfit = f.costComplete ? f.revenue - f.cogs : null;
      const margin =
        grossProfit === null || f.revenue <= 0
          ? null
          : Number(((grossProfit / f.revenue) * 100).toFixed(1));
      const lastSale = lastSaleMap.get(key);
      const input: ReplenishmentInput = {
        productId: entry.productId,
        sizeId: entry.sizeId,
        active: entry.product.isActive,
        currentStock: entry.quantity,
        unitCost: n(entry.product.costPrice),
        netUnitsSold: f.units,
        activeTradingDays: activeDays,
        observationDays,
        unfulfilledDemand: specificDemand.get(key) ?? 0,
        leadTimeDays,
        leadTimeSource,
        leadTimeSamples,
        inbound: allInboundRows,
        daysSinceSale: lastSale ? Math.max(0, businessDaysBetween(lastSale, today)) : null,
        productAgeDays: Math.max(0, businessDaysBetween(entry.product.createdAt, today)),
        grossMarginPercent: margin,
        returnRate: 0,
        stockHistoryReliable: ambiguousAdjustments === 0,
        asOfDate: todayKey,
      };
      let recommendation = calculateReplenishment(input);
      const forecast = latestForecast.get(key);
      if (
        forecast &&
        forecast.expectedQuantity !== null &&
        forecast.upperBound !== null &&
        forecast.lowerBound !== null
      ) {
        const expected = n(forecast.expectedQuantity);
        const upper = n(forecast.upperBound);
        const lower = n(forecast.lowerBound);
        const adjusted = forecastAwareRequirement({
          deterministicQuantity: recommendation.recommendedQuantity,
          currentStock: entry.quantity,
          usefulInbound: n(recommendation.evidence.usefulInbound),
          safetyStock: n(recommendation.evidence.safetyStock),
          leadTimeDays,
          forecast30: { expected, upper, evidence: forecast.evidenceQuality },
        });
        const stockout = forecastStockout({
          currentStock: entry.quantity,
          usefulInbound: n(recommendation.evidence.usefulInbound),
          transferInbound: 0,
          forecast: { expected, lower, upper, horizonDays: 30 },
        });
        const predictiveExcessUnits = Math.max(
          0,
          Math.floor(entry.quantity + n(recommendation.evidence.usefulInbound) - upper)
        );
        const canPromote =
          recommendation.reasonCodes.includes("STOCK_SUFFICIENT") &&
          adjusted.quantity !== null &&
          adjusted.quantity > 0 &&
          ["CRITICAL", "HIGH"].includes(stockout.risk);
        recommendation = {
          ...recommendation,
          ...(recommendation.type === "REORDER" || canPromote
            ? {
                type: "REORDER" as const,
                severity: stockout.risk === "CRITICAL" ? "CRITICAL" : "HIGH",
                recommendedQuantity: adjusted.quantity,
              }
            : {}),
          reasonCodes: [
            ...new Set([
              ...recommendation.reasonCodes,
              "FORECAST_EVIDENCE",
              ...(canPromote ? ["FORECAST_STOCKOUT_RISK"] : []),
              ...(predictiveExcessUnits > 0 ? ["FORECAST_EXCESS"] : []),
            ]),
          ],
          reasons: [
            ...recommendation.reasons,
            `30-day forecast ${expected} units (${lower}–${upper}) using ${forecast.method}`,
            ...(canPromote ? [`Forecast-adjusted requirement is ${adjusted.quantity} units`] : []),
            ...(predictiveExcessUnits > 0 &&
            ["OVERSTOCK", "MARKDOWN_CANDIDATE"].includes(recommendation.type)
              ? [`${predictiveExcessUnits} units remain above the forecast upper bound`]
              : []),
          ],
          evidence: {
            ...recommendation.evidence,
            forecast: {
              snapshotDate: forecast.snapshotDate.toISOString().slice(0, 10),
              expected30Days: expected,
              lower30Days: lower,
              upper30Days: upper,
              evidenceQuality: forecast.evidenceQuality,
              method: forecast.method,
              historicalEvaluation: forecast.evaluation,
              adjustmentSource: adjusted.source,
              stockoutRisk: stockout.risk,
              shortageUnits: stockout.shortageUnits,
              shortageWindow: stockout.shortageWindow,
              predictiveExcessUnits,
            },
          },
        };
      }
      return {
        recommendationId: `${storeId}:${key}:${from.toISOString()}:${endExclusive.toISOString()}`,
        productId: entry.productId,
        product: entry.product.name,
        sku: entry.product.sku,
        categoryId: entry.product.category.id,
        category: entry.product.category.name,
        brandId: entry.product.brand.id,
        brand: entry.product.brand.name,
        sizeId: entry.sizeId,
        variant: entry.size.label,
        supplierId: preferred?.supplierId ?? null,
        supplier: preferred?.supplier ?? null,
        currentStock: entry.quantity,
        ...recommendation,
      };
    });
    const evaluatedAt = new Date();
    await prisma.replenishmentRecommendation.createMany({
      data: rows.map((row) => ({
        orgId,
        storeId,
        productId: row.productId,
        sizeId: row.sizeId,
        type: row.type,
        severity: row.severity,
        recommendedQuantity: row.recommendedQuantity,
        reasonCodes: row.reasonCodes,
        reasons: row.reasons,
        evidence: row.evidence as Prisma.InputJsonValue,
        evidenceQuality: row.evidenceQuality,
        observationFrom: from,
        observationTo: endExclusive,
        horizonDays: REPLENISHMENT_POLICY.targetCoverDays,
        evaluatedAt,
      })),
      skipDuplicates: true,
    });
    const snapshots = await prisma.replenishmentRecommendation.findMany({
      where: { orgId, storeId, observationFrom: from, observationTo: endExclusive },
      select: { id: true, productId: true, sizeId: true, type: true, disposition: true },
    });
    const snapshotState = new Map(
      snapshots.map((snapshot) => [
        `${snapshot.productId}:${snapshot.sizeId}:${snapshot.type}`,
        { id: snapshot.id, disposition: snapshot.disposition },
      ])
    );
    const resultRows = rows.map((row) => ({
      ...row,
      recommendationId:
        snapshotState.get(`${row.productId}:${row.sizeId}:${row.type}`)?.id ?? row.recommendationId,
      disposition:
        snapshotState.get(`${row.productId}:${row.sizeId}:${row.type}`)?.disposition ?? "OPEN",
    }));
    const openRows = resultRows.filter((row) => row.disposition === "OPEN");
    const filtered = openRows.filter(
      (row) =>
        (!query.categoryId || row.categoryId === query.categoryId) &&
        (!query.brandId || row.brandId === query.brandId) &&
        (!query.action || row.type === query.action) &&
        (!query.supplierId || row.supplierId === query.supplierId)
    );
    const priority: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    filtered.sort(
      (a, b) =>
        (priority[b.severity] ?? 0) - (priority[a.severity] ?? 0) ||
        (b.evidence.excessInventoryValue as number) - (a.evidence.excessInventoryValue as number)
    );
    const pageSize = Math.min(500, Math.max(1, query.pageSize ?? 50));
    const page = Math.max(1, query.page ?? 1);
    const summary = {
      reorder: openRows.filter((row) => row.type === "REORDER").length,
      stockoutRisk: openRows.filter((row) => row.type === "STOCKOUT_RISK").length,
      inboundCovers: openRows.filter((row) => row.type === "INBOUND_COVERS_DEMAND").length,
      overstock: openRows.filter((row) => row.type === "OVERSTOCK").length,
      markdown: openRows.filter((row) => row.type === "MARKDOWN_CANDIDATE").length,
      noReorder: openRows.filter((row) => row.type === "NO_REORDER").length,
      monitor: openRows.filter((row) => row.type === "MONITOR").length,
      excessInventoryValue: Number(
        openRows.reduce((sum, row) => sum + Number(row.evidence.excessInventoryValue), 0).toFixed(2)
      ),
    };
    return {
      generatedAt: evaluatedAt.toISOString(),
      scope: { type: "STORE", storeId: store.id, storeName: store.name },
      range: {
        from: from.toISOString(),
        toExclusive: endExclusive.toISOString(),
        activeTradingDays: activeDays,
        observationDays,
      },
      policy: REPLENISHMENT_POLICY,
      methodology: {
        velocity:
          "Return-adjusted net units sold divided by store trading days with at least one eligible sale in the observation window.",
        demand:
          "Unfulfilled demand remains a separate signal; 25% is used only as a conservative safety-stock buffer.",
        inbound:
          "Inbound protects the recommendation only when its expected date is on or before estimated stockout.",
        leadTime:
          "Supplier-product median, then supplier median, then an explicit 14-day fallback.",
        target:
          "30 trading days of velocity plus safety stock. Recommended quantity = target − current stock − timely inbound.",
      },
      summary,
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
      filters: {
        categories: [
          ...new Map(
            openRows.map((row) => [row.categoryId, { id: row.categoryId, name: row.category }])
          ).values(),
        ],
        brands: [
          ...new Map(
            openRows.map((row) => [row.brandId, { id: row.brandId, name: row.brand }])
          ).values(),
        ],
        suppliers: [
          ...new Map(
            openRows
              .filter((row) => row.supplierId)
              .map((row) => [row.supplierId!, { id: row.supplierId!, name: row.supplier! }])
          ).values(),
        ],
      },
    };
  },
};
