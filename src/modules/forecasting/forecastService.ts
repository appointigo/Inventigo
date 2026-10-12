import "server-only";
import { Prisma, RecommendationEvidenceQuality } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addBusinessDays,
  businessDateEndExclusive,
  businessDateForInstant,
  businessDateStart,
} from "@/modules/analytics/utils/dateRange";
import { resolveStockDelta } from "@/modules/stock/utils/stockMovementContract";
import {
  buildForecast,
  errorMetrics,
  forecastStockout,
  FORECAST_POLICY,
  type DailyDemand,
} from "./forecastRules";

const key = (productId: string, sizeId: string) => `${productId}:${sizeId}`;
const n = (value: unknown) => Number(value ?? 0);
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

function dateKeys(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addBusinessDays(date, 1)) dates.push(date);
  return dates;
}

export const forecastService = {
  async generate(orgId: string, storeId: string, now = new Date()) {
    const snapshotDate = businessDateForInstant(now);
    const historyFromKey = addBusinessDays(snapshotDate, -(FORECAST_POLICY.historyWindowDays - 1));
    const from = businessDateStart(historyFromKey);
    const endExclusive = businessDateEndExclusive(snapshotDate);
    const [store, stocks, sales, returns, movements, demands, purchaseItems, transferItems] =
      await Promise.all([
        prisma.store.findFirstOrThrow({
          where: { id: storeId, orgId, isActive: true },
          select: { id: true, name: true },
        }),
        prisma.stockEntry.findMany({
          where: { storeId, store: { orgId } },
          select: {
            productId: true,
            sizeId: true,
            quantity: true,
            product: {
              select: { name: true, sku: true, isActive: true, costPrice: true, createdAt: true },
            },
            size: { select: { label: true } },
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
            items: { select: { productId: true, sizeId: true, quantity: true } },
          },
        }),
        prisma.returnTransaction.findMany({
          where: { storeId, store: { orgId }, businessDate: { gte: from, lt: endExclusive } },
          select: {
            businessDate: true,
            refundAmount: true,
            items: {
              select: {
                returnedProductId: true,
                returnedSizeId: true,
                returnedQuantity: true,
                newProductId: true,
                newSizeId: true,
                newQuantity: true,
              },
            },
          },
        }),
        prisma.stockMovement.findMany({
          where: { storeId, store: { orgId }, movementDate: { gte: from, lt: endExclusive } },
          select: {
            productId: true,
            sizeId: true,
            type: true,
            quantity: true,
            deltaQuantity: true,
            quantityBefore: true,
            quantityAfter: true,
            movementDate: true,
          },
          orderBy: [{ movementDate: "asc" }, { createdAt: "asc" }],
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
            createdAt: true,
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
            productId: true,
            sizeId: true,
            quantity: true,
            receiptItems: { select: { quantityAccepted: true } },
            purchaseOrder: { select: { expectedDeliveryDate: true } },
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
      ]);
    const dates = dateKeys(historyFromKey, snapshotDate);
    const daily = new Map<
      string,
      Map<string, { units: number; saleIds: Set<string>; demand: number }>
    >();
    const getDay = (variant: string, date: string) => {
      const byDate = daily.get(variant) ?? new Map();
      daily.set(variant, byDate);
      const row = byDate.get(date) ?? { units: 0, saleIds: new Set<string>(), demand: 0 };
      byDate.set(date, row);
      return row;
    };
    for (const sale of sales)
      for (const item of sale.items) {
        const row = getDay(
          key(item.productId, item.sizeId),
          businessDateForInstant(sale.transactionDate)
        );
        row.units += item.quantity;
        row.saleIds.add(sale.id);
      }
    for (const transaction of returns)
      for (const item of transaction.items) {
        const date = businessDateForInstant(transaction.businessDate);
        if (item.returnedProductId && item.returnedSizeId)
          getDay(key(item.returnedProductId, item.returnedSizeId), date).units -=
            item.returnedQuantity;
        if (item.newProductId && item.newSizeId)
          getDay(key(item.newProductId, item.newSizeId), date).units += item.newQuantity ?? 0;
      }
    const stockByProduct = new Map<string, typeof stocks>();
    for (const stock of stocks)
      stockByProduct.set(stock.productId, [...(stockByProduct.get(stock.productId) ?? []), stock]);
    for (const demand of demands) {
      if (!demand.productId) continue;
      const attrs = demand.attributes as Record<string, unknown>;
      const requestedSize = typeof attrs.sizeId === "string" ? attrs.sizeId : null;
      const variant = requestedSize
        ? key(demand.productId, requestedSize)
        : stockByProduct.get(demand.productId)?.toSorted((a, b) => a.quantity - b.quantity)[0]
          ? key(
              demand.productId,
              stockByProduct.get(demand.productId)!.toSorted((a, b) => a.quantity - b.quantity)[0]
                .sizeId
            )
          : null;
      if (variant)
        getDay(variant, businessDateForInstant(demand.createdAt)).demand += Math.max(
          0,
          demand.requestedQuantity - demand.fulfilledQuantity
        );
    }
    const movementsByVariant = new Map<string, typeof movements>();
    for (const movement of movements)
      movementsByVariant.set(key(movement.productId, movement.sizeId), [
        ...(movementsByVariant.get(key(movement.productId, movement.sizeId)) ?? []),
        movement,
      ]);
    const inbound = new Map<string, { purchase: number; transfer: number }>();
    for (const item of purchaseItems) {
      if (!item.productId || !item.sizeId) continue;
      const open = Math.max(
        0,
        item.quantity -
          item.receiptItems.reduce((sum, receipt) => sum + receipt.quantityAccepted, 0)
      );
      const useful =
        !item.purchaseOrder.expectedDeliveryDate ||
        item.purchaseOrder.expectedDeliveryDate.toISOString().slice(0, 10) >= snapshotDate
          ? open
          : 0;
      const current = inbound.get(key(item.productId, item.sizeId)) ?? { purchase: 0, transfer: 0 };
      current.purchase += useful;
      inbound.set(key(item.productId, item.sizeId), current);
    }
    for (const item of transferItems) {
      const open = Math.max(
        0,
        item.dispatchedQuantity - item.receivedQuantity - item.damagedQuantity
      );
      const useful =
        !item.transfer.expectedArrivalAt ||
        item.transfer.expectedArrivalAt.toISOString().slice(0, 10) >= snapshotDate
          ? open
          : 0;
      const current = inbound.get(key(item.productId, item.sizeId)) ?? { purchase: 0, transfer: 0 };
      current.transfer += useful;
      inbound.set(key(item.productId, item.sizeId), current);
    }
    const returnHistoryComplete = returns.every(
      (transaction) => n(transaction.refundAmount) === 0 || transaction.items.length > 0
    );
    const writes: Prisma.PrismaPromise<{ id: string }>[] = [];
    for (const stock of stocks.filter((row) => row.product.isActive)) {
      const variant = key(stock.productId, stock.sizeId);
      const variantMovements = movementsByVariant.get(variant) ?? [];
      const hasRecordedSales = [...(daily.get(variant)?.values() ?? [])].some(
        (row) => row.units > 0
      );
      let reliable =
        returnHistoryComplete &&
        variantMovements.every(
          (movement) => movement.deltaQuantity !== null || movement.type !== "ADJUSTMENT"
        ) &&
        (!hasRecordedSales || variantMovements.some((movement) => movement.type === "SALE"));
      const deltas = new Map<string, number>();
      let totalDelta = 0;
      for (const movement of variantMovements) {
        let delta: number;
        try {
          delta =
            movement.deltaQuantity ??
            resolveStockDelta({
              type: movement.type,
              quantity: movement.quantity,
              quantityBefore: movement.quantityBefore ?? 0,
            });
        } catch {
          reliable = false;
          delta = 0;
        }
        const date = businessDateForInstant(movement.movementDate);
        deltas.set(date, (deltas.get(date) ?? 0) + delta);
        totalDelta += delta;
      }
      let runningStock = stock.quantity - totalDelta;
      const productHistoryFrom = [historyFromKey, businessDateForInstant(stock.product.createdAt)]
        .toSorted()
        .at(-1)!;
      const series: DailyDemand[] = dates
        .filter((date) => date >= productHistoryFrom)
        .map((date) => {
          const opening = runningStock;
          runningStock += deltas.get(date) ?? 0;
          const row = daily.get(variant)?.get(date);
          return {
            date,
            netUnits: row?.units ?? 0,
            transactions: row?.saleIds.size ?? 0,
            inStock: reliable ? opening > 0 || runningStock > 0 : null,
            unfulfilledDemand: row?.demand ?? 0,
          };
        });
      for (const horizonDays of [7, 30] as const) {
        const result = buildForecast(series, horizonDays, reliable);
        const forecast = result.forecast;
        const incoming = inbound.get(variant) ?? { purchase: 0, transfer: 0 };
        const stockout = forecastStockout({
          currentStock: stock.quantity,
          usefulInbound: incoming.purchase,
          transferInbound: incoming.transfer,
          forecast: forecast ? { ...forecast, horizonDays } : null,
        });
        const evidence = {
          ...result.readiness,
          ...result.evidence,
          evaluations: result.evaluations,
          currentStock: stock.quantity,
          usefulInbound: incoming.purchase,
          usefulTransferInbound: incoming.transfer,
          stockout,
          product: stock.product.name,
          sku: stock.product.sku,
          variant: stock.size.label,
          unitCost: n(stock.product.costPrice),
          returnHistoryComplete,
          methodology:
            "Return-adjusted daily demand; zero-stock days are censored when signed stock history is reliable. Unfulfilled requests are disclosed but not converted into fabricated sales.",
        };
        writes.push(
          prisma.demandForecast.upsert({
            where: {
              storeId_productId_sizeId_snapshotDate_horizonDays_modelVersion: {
                storeId,
                productId: stock.productId,
                sizeId: stock.sizeId,
                snapshotDate: dateOnly(snapshotDate),
                horizonDays,
                modelVersion: FORECAST_POLICY.modelVersion,
              },
            },
            update: {
              readiness: result.readiness.readiness,
              evidenceQuality: result.readiness.evidence as RecommendationEvidenceQuality,
              method: forecast?.method ?? null,
              expectedQuantity: forecast?.expected,
              lowerBound: forecast?.lower,
              upperBound: forecast?.upper,
              trend: result.trend,
              historyFrom: dateOnly(productHistoryFrom),
              historyTo: dateOnly(snapshotDate),
              policyVersion: FORECAST_POLICY.policyVersion,
              evidence: evidence as Prisma.InputJsonValue,
              evaluation: forecast?.metrics as Prisma.InputJsonValue | undefined,
              generatedAt: now,
            },
            create: {
              orgId,
              storeId,
              productId: stock.productId,
              sizeId: stock.sizeId,
              snapshotDate: dateOnly(snapshotDate),
              horizonDays,
              readiness: result.readiness.readiness,
              evidenceQuality: result.readiness.evidence as RecommendationEvidenceQuality,
              method: forecast?.method ?? null,
              expectedQuantity: forecast?.expected,
              lowerBound: forecast?.lower,
              upperBound: forecast?.upper,
              trend: result.trend,
              historyFrom: dateOnly(productHistoryFrom),
              historyTo: dateOnly(snapshotDate),
              modelVersion: FORECAST_POLICY.modelVersion,
              policyVersion: FORECAST_POLICY.policyVersion,
              evidence: evidence as Prisma.InputJsonValue,
              evaluation: forecast?.metrics as Prisma.InputJsonValue | undefined,
            },
            select: { id: true },
          })
        );
      }
    }
    await prisma.$transaction(writes);
    await this.evaluate(orgId, storeId, now);
    return { generatedAt: now.toISOString(), store, snapshots: writes.length };
  },

  async evaluate(orgId: string, storeId: string, now = new Date()) {
    const today = businessDateForInstant(now);
    const due = await prisma.demandForecast.findMany({
      where: {
        orgId,
        storeId,
        outcome: null,
        expectedQuantity: { not: null },
        snapshotDate: { lt: dateOnly(today) },
      },
      select: {
        id: true,
        productId: true,
        sizeId: true,
        snapshotDate: true,
        horizonDays: true,
        expectedQuantity: true,
      },
    });
    const eligible = due
      .map((forecast) => {
        const fromKey = addBusinessDays(forecast.snapshotDate.toISOString().slice(0, 10), 1);
        return { ...forecast, fromKey, toKey: addBusinessDays(fromKey, forecast.horizonDays - 1) };
      })
      .filter((forecast) => forecast.toKey < today);
    if (!eligible.length) return { evaluated: 0 };
    const firstDate = eligible.map((row) => row.fromKey).toSorted()[0];
    const lastDate = eligible
      .map((row) => row.toKey)
      .toSorted()
      .at(-1)!;
    const productIds = [...new Set(eligible.map((row) => row.productId))];
    const sizeIds = [...new Set(eligible.map((row) => row.sizeId))];
    const range = { gte: businessDateStart(firstDate), lt: businessDateEndExclusive(lastDate) };
    const [saleItems, returnItems, stockouts] = await Promise.all([
      prisma.saleItem.findMany({
        where: {
          productId: { in: productIds },
          sizeId: { in: sizeIds },
          sale: {
            storeId,
            store: { orgId },
            transactionDate: range,
            status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          },
        },
        select: {
          productId: true,
          sizeId: true,
          quantity: true,
          sale: { select: { transactionDate: true } },
        },
      }),
      prisma.returnTransactionItem.findMany({
        where: {
          returnTransaction: { storeId, store: { orgId }, businessDate: range },
          OR: [
            { returnedProductId: { in: productIds }, returnedSizeId: { in: sizeIds } },
            { newProductId: { in: productIds }, newSizeId: { in: sizeIds } },
          ],
        },
        select: {
          returnedProductId: true,
          returnedSizeId: true,
          returnedQuantity: true,
          newProductId: true,
          newSizeId: true,
          newQuantity: true,
          returnTransaction: { select: { businessDate: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          storeId,
          store: { orgId },
          productId: { in: productIds },
          sizeId: { in: sizeIds },
          movementDate: range,
          quantityAfter: 0,
        },
        select: { productId: true, sizeId: true, movementDate: true },
      }),
    ]);
    const events = new Map<string, Array<{ date: string; quantity: number }>>();
    const addEvent = (variant: string, date: string, quantity: number) =>
      events.set(variant, [...(events.get(variant) ?? []), { date, quantity }]);
    for (const item of saleItems)
      addEvent(
        key(item.productId, item.sizeId),
        businessDateForInstant(item.sale.transactionDate),
        item.quantity
      );
    for (const item of returnItems) {
      const date = businessDateForInstant(item.returnTransaction.businessDate);
      if (item.returnedProductId && item.returnedSizeId)
        addEvent(key(item.returnedProductId, item.returnedSizeId), date, -item.returnedQuantity);
      if (item.newProductId && item.newSizeId)
        addEvent(key(item.newProductId, item.newSizeId), date, item.newQuantity ?? 0);
    }
    const stockoutDates = new Map<string, string[]>();
    for (const movement of stockouts) {
      const variant = key(movement.productId, movement.sizeId);
      stockoutDates.set(variant, [
        ...(stockoutDates.get(variant) ?? []),
        businessDateForInstant(movement.movementDate),
      ]);
    }
    const outcomes = eligible.map((forecast) => {
      const variant = key(forecast.productId, forecast.sizeId);
      const actual = Math.max(
        0,
        (events.get(variant) ?? [])
          .filter((event) => event.date >= forecast.fromKey && event.date <= forecast.toKey)
          .reduce((sum, event) => sum + event.quantity, 0)
      );
      const expected = n(forecast.expectedQuantity);
      return {
        forecastId: forecast.id,
        actualQuantity: actual,
        absoluteError: Math.abs(expected - actual),
        bias: expected - actual,
        stockoutDistorted: (stockoutDates.get(variant) ?? []).some(
          (date) => date >= forecast.fromKey && date <= forecast.toKey
        ),
        actualFrom: dateOnly(forecast.fromKey),
        actualTo: dateOnly(forecast.toKey),
      };
    });
    await prisma.demandForecastOutcome.createMany({ data: outcomes, skipDuplicates: true });
    return { evaluated: outcomes.length };
  },

  async getStore(orgId: string, storeId: string) {
    const latest = await prisma.demandForecast.findFirst({
      where: { orgId, storeId },
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true },
    });
    if (!latest)
      return {
        generatedAt: null,
        summary: { variants: 0, ready: 0, limited: 0, notReady: 0, highStockoutRisk: 0 },
        items: [],
        performance: {
          samples: 0,
          mae: 0,
          wape: null,
          bias: null,
          underForecasts: 0,
          overForecasts: 0,
          stockoutDistorted: 0,
        },
        policy: FORECAST_POLICY,
      };
    const rows = await prisma.demandForecast.findMany({
      where: { orgId, storeId, snapshotDate: latest.snapshotDate },
      include: {
        product: { select: { name: true, sku: true } },
        size: { select: { label: true } },
        outcome: true,
      },
      orderBy: [{ evidenceQuality: "asc" }, { product: { name: "asc" } }],
    });
    const outcomes = await prisma.demandForecastOutcome.findMany({
      where: { forecast: { orgId, storeId } },
      select: { actualQuantity: true, bias: true, absoluteError: true, stockoutDistorted: true },
    });
    const metrics = errorMetrics(
      outcomes.map((row) => n(row.actualQuantity)),
      outcomes.map((row) => n(row.actualQuantity) + n(row.bias))
    );
    const items = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      sizeId: row.sizeId,
      product: row.product.name,
      sku: row.product.sku,
      variant: row.size.label,
      horizonDays: row.horizonDays,
      readiness: row.readiness,
      evidenceQuality: row.evidenceQuality,
      method: row.method,
      expected: row.expectedQuantity === null ? null : n(row.expectedQuantity),
      lower: row.lowerBound === null ? null : n(row.lowerBound),
      upper: row.upperBound === null ? null : n(row.upperBound),
      trend: row.trend,
      modelVersion: row.modelVersion,
      policyVersion: row.policyVersion,
      evidence: row.evidence,
      evaluation: row.evaluation,
      outcome: row.outcome
        ? {
            actual: n(row.outcome.actualQuantity),
            absoluteError: n(row.outcome.absoluteError),
            bias: n(row.outcome.bias),
            stockoutDistorted: row.outcome.stockoutDistorted,
          }
        : null,
    }));
    const thirty = items.filter((row) => row.horizonDays === 30);
    const performance = {
      ...metrics,
      underForecasts: outcomes.filter((row) => n(row.bias) < 0).length,
      overForecasts: outcomes.filter((row) => n(row.bias) > 0).length,
      stockoutDistorted: outcomes.filter((row) => row.stockoutDistorted).length,
    };
    return {
      generatedAt: rows[0]?.generatedAt.toISOString() ?? null,
      snapshotDate: latest.snapshotDate.toISOString().slice(0, 10),
      summary: {
        variants: thirty.length,
        ready: thirty.filter((row) => row.readiness === "READY").length,
        limited: thirty.filter((row) => row.readiness === "LIMITED").length,
        notReady: thirty.filter((row) => row.readiness === "NOT_READY").length,
        highStockoutRisk: thirty.filter((row) =>
          ["CRITICAL", "HIGH"].includes(
            String(
              (row.evidence as Record<string, unknown>).stockout &&
                (row.evidence as Record<string, { risk?: string }>).stockout?.risk
            )
          )
        ).length,
      },
      items,
      performance,
      policy: FORECAST_POLICY,
    };
  },
};
