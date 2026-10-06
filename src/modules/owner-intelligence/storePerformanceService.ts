import { prisma } from "@/lib/db";
import {
  aggregateFinancialEvents,
  calculateReturnCostEvent,
} from "@/modules/analytics/utils/financialAggregation";
import type { FinancialEvent } from "@/modules/analytics/types";
import {
  calculateSellThrough,
  resolveMovementDelta,
} from "@/modules/inventory-intelligence/utils/metrics";
import { PRODUCT_DECISION_THRESHOLDS } from "@/modules/product-intelligence/productDecisionRules";

const n = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Number(value.toFixed(2));
const variant = (productId: string, sizeId: string) => `${productId}:${sizeId}`;

export const storePerformanceService = {
  async get(orgId: string, from: Date, endExclusive: Date) {
    const duration = endExclusive.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - duration);
    const common = { store: { orgId } };
    const [
      stores,
      sales,
      returns,
      expenses,
      stock,
      movements,
      lastSales,
      demand,
      receivables,
      firstPurchases,
    ] = await Promise.all([
      prisma.store.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.sale.findMany({
        where: {
          ...common,
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { gte: previousFrom, lt: endExclusive },
        },
        select: {
          id: true,
          storeId: true,
          transactionDate: true,
          total: true,
          customerId: true,
          amountDue: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              costPrice: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      prisma.returnTransaction.findMany({
        where: { ...common, businessDate: { gte: previousFrom, lt: endExclusive } },
        select: {
          storeId: true,
          type: true,
          businessDate: true,
          refundAmount: true,
          netAmount: true,
          items: {
            select: {
              returnedProductId: true,
              returnedSizeId: true,
              returnedQuantity: true,
              returnedUnitPrice: true,
              returnedLineAmount: true,
              newProductId: true,
              newQuantity: true,
              newUnitPrice: true,
              newCostPrice: true,
            },
          },
          sale: {
            select: {
              customerId: true,
              transactionDate: true,
              items: { select: { productId: true, sizeId: true, costPrice: true } },
            },
          },
        },
      }),
      prisma.storeExpense.groupBy({
        by: ["storeId"],
        where: { orgId, status: "APPROVED", date: { gte: from, lt: endExclusive } },
        _sum: { amount: true },
      }),
      prisma.stockEntry.findMany({
        where: { store: { orgId } },
        select: {
          storeId: true,
          productId: true,
          quantity: true,
          product: { select: { name: true, costPrice: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: { ...common, movementDate: { gte: from, lt: endExclusive } },
        select: { storeId: true, productId: true, type: true, quantity: true, deltaQuantity: true },
      }),
      prisma.stockMovement.groupBy({
        by: ["storeId", "productId"],
        where: { ...common, type: "SALE", movementDate: { lt: endExclusive } },
        _max: { movementDate: true },
      }),
      prisma.demandRequest.groupBy({
        by: ["storeId"],
        where: { orgId, createdAt: { gte: from, lt: endExclusive } },
        _sum: { requestedQuantity: true, fulfilledQuantity: true },
      }),
      prisma.sale.groupBy({
        by: ["storeId"],
        where: { ...common, amountDue: { gt: 0 } },
        _sum: { amountDue: true },
        _count: { _all: true },
      }),
      prisma.sale.groupBy({
        by: ["customerId"],
        where: {
          ...common,
          customerId: { not: null },
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { lt: endExclusive },
        },
        _min: { transactionDate: true },
      }),
    ]);
    const transfers = await prisma.stockTransfer.findMany({
      where: {
        orgId,
        OR: [
          { dispatchedAt: { gte: from, lt: endExclusive } },
          { receivedAt: { gte: from, lt: endExclusive } },
          { status: { in: ["DISPATCHED", "PARTIALLY_RECEIVED"] } },
        ],
      },
      select: {
        sourceStoreId: true,
        destinationStoreId: true,
        status: true,
        dispatchedAt: true,
        receivedAt: true,
        items: {
          select: {
            dispatchedQuantity: true,
            receivedQuantity: true,
            damagedQuantity: true,
            product: { select: { costPrice: true } },
          },
        },
      },
    });
    const events = new Map<string, FinancialEvent[]>();
    const push = (storeId: string, event: FinancialEvent) =>
      events.set(storeId, [...(events.get(storeId) ?? []), event]);
    for (const sale of sales) {
      const costs = sale.items.map((item) =>
        item.costPrice === null ? null : n(item.costPrice) * item.quantity
      );
      push(sale.storeId, {
        date: sale.transactionDate,
        revenue: n(sale.total),
        cogs: costs.every((cost) => cost !== null)
          ? costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
          : null,
        discount: 0,
        orderCount: 1,
        returnValue: 0,
        returnCount: 0,
        exchangeCount: 0,
        completenessReasons: costs.some((cost) => cost === null) ? ["MISSING_SALE_ITEM_COST"] : [],
      });
    }
    for (const transaction of returns) {
      const costs = new Map(
        transaction.sale.items.map((item) => [
          variant(item.productId, item.sizeId),
          item.costPrice === null ? null : n(item.costPrice),
        ])
      );
      const returned = transaction.items.filter(
        (item) => item.returnedProductId && item.returnedSizeId && item.returnedQuantity > 0
      );
      const replacements = transaction.items.filter(
        (item) => item.newProductId && (item.newQuantity ?? 0) > 0
      );
      const returnedRevenue = returned.reduce(
        (sum, item) =>
          sum + n(item.returnedLineAmount ?? n(item.returnedUnitPrice) * item.returnedQuantity),
        0
      );
      const replacementRevenue = replacements.reduce(
        (sum, item) => sum + n(item.newUnitPrice) * n(item.newQuantity),
        0
      );
      const calculated = calculateReturnCostEvent(
        returned.map((item) => {
          const cost = costs.get(variant(item.returnedProductId!, item.returnedSizeId!));
          return cost == null ? null : cost * item.returnedQuantity;
        }),
        replacements.map((item) =>
          item.newCostPrice === null ? null : n(item.newCostPrice) * n(item.newQuantity)
        ),
        returned.length + replacements.length > 0
      );
      push(transaction.storeId, {
        date: transaction.businessDate,
        revenue:
          returned.length + replacements.length
            ? replacementRevenue - returnedRevenue
            : transaction.type === "RETURN"
              ? -n(transaction.refundAmount)
              : n(transaction.netAmount),
        cogs: calculated.cogs,
        discount: 0,
        orderCount: 0,
        returnValue: returnedRevenue,
        returnCount: transaction.type === "EXCHANGE" ? 0 : 1,
        exchangeCount: transaction.type === "RETURN" ? 0 : 1,
        completenessReasons: calculated.completenessReasons,
      });
    }
    const expenseMap = new Map(expenses.map((row) => [row.storeId, n(row._sum.amount)]));
    const lastSaleMap = new Map(
      lastSales.map((row) => [`${row.storeId}:${row.productId}`, row._max.movementDate])
    );
    const stockMap = new Map<string, { units: number; value: number; slowDeadValue: number }>();
    for (const row of stock) {
      const value = stockMap.get(row.storeId) ?? { units: 0, value: 0, slowDeadValue: 0 };
      const inventoryValue = Math.max(0, row.quantity) * n(row.product.costPrice);
      const last = lastSaleMap.get(`${row.storeId}:${row.productId}`);
      const inactiveDays = last ? (endExclusive.getTime() - last.getTime()) / 86_400_000 : Infinity;
      value.units += row.quantity;
      value.value += inventoryValue;
      if (inactiveDays >= PRODUCT_DECISION_THRESHOLDS.slowMovingDays)
        value.slowDeadValue += inventoryValue;
      stockMap.set(row.storeId, value);
    }
    const movementMap = new Map<string, { delta: number; inbound: number; complete: boolean }>();
    for (const row of movements) {
      const item = movementMap.get(row.storeId) ?? { delta: 0, inbound: 0, complete: true };
      const delta = resolveMovementDelta(row.type, row.quantity, row.deltaQuantity);
      if (delta === null) item.complete = false;
      else {
        item.delta += delta;
        if (delta > 0) item.inbound += delta;
      }
      movementMap.set(row.storeId, item);
    }
    const transferMap = new Map<
      string,
      {
        out: number;
        in: number;
        inTransit: number;
        shortages: number;
        value: number;
        completed: number;
      }
    >();
    for (const transfer of transfers) {
      const source = transferMap.get(transfer.sourceStoreId) ?? {
        out: 0,
        in: 0,
        inTransit: 0,
        shortages: 0,
        value: 0,
        completed: 0,
      };
      const destination = transferMap.get(transfer.destinationStoreId) ?? {
        out: 0,
        in: 0,
        inTransit: 0,
        shortages: 0,
        value: 0,
        completed: 0,
      };
      for (const item of transfer.items) {
        if (
          transfer.dispatchedAt &&
          transfer.dispatchedAt >= from &&
          transfer.dispatchedAt < endExclusive
        )
          source.out += item.dispatchedQuantity;
        if (
          transfer.receivedAt &&
          transfer.receivedAt >= from &&
          transfer.receivedAt < endExclusive
        )
          destination.in += item.receivedQuantity;
        if (["DISPATCHED", "PARTIALLY_RECEIVED"].includes(transfer.status))
          destination.inTransit += Math.max(
            0,
            item.dispatchedQuantity - item.receivedQuantity - item.damagedQuantity
          );
        destination.shortages += item.damagedQuantity;
        source.value += item.dispatchedQuantity * n(item.product.costPrice);
      }
      if (
        transfer.status === "RECEIVED" &&
        transfer.receivedAt &&
        transfer.receivedAt >= from &&
        transfer.receivedAt < endExclusive
      )
        destination.completed += 1;
      transferMap.set(transfer.sourceStoreId, source);
      transferMap.set(transfer.destinationStoreId, destination);
    }
    const demandMap = new Map(
      demand.map((row) => [
        row.storeId,
        { requested: row._sum.requestedQuantity ?? 0, fulfilled: row._sum.fulfilledQuantity ?? 0 },
      ])
    );
    const receivableMap = new Map(
      receivables.map((row) => [
        row.storeId,
        { value: n(row._sum.amountDue), count: row._count._all },
      ])
    );
    const firstPurchaseMap = new Map(
      firstPurchases.flatMap((row) =>
        row.customerId && row._min.transactionDate
          ? [[row.customerId, row._min.transactionDate] as const]
          : []
      )
    );
    const rows = stores.map((store) => {
      const all = events.get(store.id) ?? [];
      const current = all.filter((event) => event.date >= from);
      const previous = all.filter((event) => event.date < from);
      const currentSummary = aggregateFinancialEvents(
        current,
        from,
        new Date(endExclusive.getTime() - 1),
        "month"
      ).summary;
      const previousSummary = aggregateFinancialEvents(
        previous,
        previousFrom,
        new Date(from.getTime() - 1),
        "month"
      ).summary;
      const expense = expenseMap.get(store.id) ?? 0;
      const inventory = stockMap.get(store.id) ?? { units: 0, value: 0, slowDeadValue: 0 };
      const movement = movementMap.get(store.id) ?? { delta: 0, inbound: 0, complete: true };
      const d = demandMap.get(store.id) ?? { requested: 0, fulfilled: 0 };
      const r = receivableMap.get(store.id) ?? { value: 0, count: 0 };
      const currentSales = sales.filter(
        (sale) => sale.storeId === store.id && sale.transactionDate >= from
      );
      let identified = currentSales
        .filter((sale) => sale.customerId)
        .reduce((sum, sale) => sum + n(sale.total), 0);
      let repeat = currentSales
        .filter(
          (sale) =>
            sale.customerId &&
            firstPurchaseMap.get(sale.customerId)?.getTime() !== sale.transactionDate.getTime()
        )
        .reduce((sum, sale) => sum + n(sale.total), 0);
      for (const transaction of returns.filter(
        (item) => item.storeId === store.id && item.businessDate >= from && item.sale.customerId
      )) {
        const returned = transaction.items.reduce(
          (sum, item) =>
            sum +
            (item.returnedProductId
              ? n(item.returnedLineAmount ?? n(item.returnedUnitPrice) * item.returnedQuantity)
              : 0),
          0
        );
        const replacement = transaction.items.reduce(
          (sum, item) => sum + (item.newProductId ? n(item.newUnitPrice) * n(item.newQuantity) : 0),
          0
        );
        const adjustment = transaction.items.length
          ? replacement - returned
          : transaction.type === "RETURN"
            ? -n(transaction.refundAmount)
            : n(transaction.netAmount);
        identified += adjustment;
        if (
          firstPurchaseMap.get(transaction.sale.customerId!)?.getTime() !==
          transaction.sale.transactionDate.getTime()
        )
          repeat += adjustment;
      }
      const units = currentSales.reduce(
        (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );
      const netProfit =
        currentSummary.grossProfit === null ? null : round(currentSummary.grossProfit - expense);
      const openingStock = inventory.units - movement.delta;
      const transfer = transferMap.get(store.id) ?? {
        out: 0,
        in: 0,
        inTransit: 0,
        shortages: 0,
        value: 0,
        completed: 0,
      };
      return {
        id: store.id,
        store: store.name,
        revenue: currentSummary.revenue,
        revenueGrowth: previousSummary.revenue
          ? round(
              ((currentSummary.revenue - previousSummary.revenue) / previousSummary.revenue) * 100
            )
          : null,
        orders: currentSummary.orders,
        averageOrderValue: currentSummary.averageOrderValue,
        grossProfit: currentSummary.grossProfit,
        grossMargin:
          currentSummary.grossProfit === null || !currentSummary.revenue
            ? null
            : round((currentSummary.grossProfit / currentSummary.revenue) * 100),
        operatingExpenses: round(expense),
        netProfit,
        netMargin:
          netProfit === null || !currentSummary.revenue
            ? null
            : round((netProfit / currentSummary.revenue) * 100),
        inventoryUnits: inventory.units,
        inventoryValue: round(inventory.value),
        stockCoverDays:
          units > 0 ? round(inventory.units / (units / Math.max(1, duration / 86_400_000))) : null,
        sellThrough: movement.complete
          ? calculateSellThrough(units, openingStock, movement.inbound)
          : null,
        slowDeadStockValue: round(inventory.slowDeadValue),
        demandFulfillment: d.requested ? round((d.fulfilled / d.requested) * 100) : null,
        unfulfilledDemand: Math.max(0, d.requested - d.fulfilled),
        identifiedRevenueShare: currentSummary.revenue
          ? round((identified / currentSummary.revenue) * 100)
          : 0,
        repeatRevenueShare: currentSummary.revenue
          ? round((repeat / currentSummary.revenue) * 100)
          : 0,
        receivables: round(r.value),
        receivableInvoices: r.count,
        costComplete: currentSummary.cogs !== null,
        transferOutUnits: transfer.out,
        transferInUnits: transfer.in,
        transferInTransitUnits: transfer.inTransit,
        transferShortageUnits: transfer.shortages,
        transferredInventoryValue: round(transfer.value),
        transfersCompleted: transfer.completed,
      };
    });
    const total = {
      revenue: round(rows.reduce((sum, row) => sum + row.revenue, 0)),
      orders: rows.reduce((sum, row) => sum + row.orders, 0),
      inventoryValue: round(rows.reduce((sum, row) => sum + row.inventoryValue, 0)),
      receivables: round(rows.reduce((sum, row) => sum + row.receivables, 0)),
    };
    const productStore = new Map<
      string,
      {
        productId: string;
        product: string;
        stores: Map<string, { store: string; stock: number; sales: number }>;
      }
    >();
    for (const entry of stock) {
      const product = productStore.get(entry.productId) ?? {
        productId: entry.productId,
        product: entry.product.name,
        stores: new Map(),
      };
      const storeName = stores.find((item) => item.id === entry.storeId)?.name ?? entry.storeId;
      const storeRow = product.stores.get(entry.storeId) ?? {
        store: storeName,
        stock: 0,
        sales: 0,
      };
      storeRow.stock += entry.quantity;
      product.stores.set(entry.storeId, storeRow);
      productStore.set(entry.productId, product);
    }
    for (const sale of sales.filter((item) => item.transactionDate >= from))
      for (const item of sale.items) {
        const product = productStore.get(item.productId) ?? {
          productId: item.productId,
          product: item.product.name,
          stores: new Map(),
        };
        const storeName = stores.find((store) => store.id === sale.storeId)?.name ?? sale.storeId;
        const storeRow = product.stores.get(sale.storeId) ?? {
          store: storeName,
          stock: 0,
          sales: 0,
        };
        storeRow.sales += item.quantity;
        product.stores.set(sale.storeId, storeRow);
        productStore.set(item.productId, product);
      }
    const productComparison = [...productStore.values()]
      .filter((product) => product.stores.size > 1)
      .map((product) => ({
        productId: product.productId,
        product: product.product,
        stores: [...product.stores.values()],
      }))
      .sort((a, b) => a.product.localeCompare(b.product));
    return {
      range: { from: from.toISOString(), toExclusive: endExclusive.toISOString() },
      methodology: {
        comparison: "Immediately preceding period of equal length.",
        revenue: "Canonical net revenue including dated returns and exchanges.",
        profit: "Unavailable where immutable cost snapshots are incomplete.",
      },
      total,
      rows,
      productComparison,
    };
  },
};
