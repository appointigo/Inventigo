import { prisma } from "@/lib/db";
import { inventoryIntelligenceService } from "@/modules/inventory-intelligence/services/inventoryIntelligenceService";
import { resolveSaleLineRevenue } from "@/modules/inventory-intelligence/utils/metrics";
import type { AnalyticsPeriod } from "@/modules/inventory-intelligence/types";
import { deriveProductDecision } from "./productDecisionRules";
import type { ProductIntelligenceResponse, ProductIntelligenceRow } from "./types";

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
type Financial = {
  revenue: number;
  units: number;
  returnedUnits: number;
  orders: Set<string>;
  cogs: number;
  costComplete: boolean;
  discount: number;
  returnMargin: number;
  returnMarginComplete: boolean;
};
const emptyFinancial = (): Financial => ({
  revenue: 0,
  units: 0,
  returnedUnits: 0,
  orders: new Set(),
  cogs: 0,
  costComplete: true,
  discount: 0,
  returnMargin: 0,
  returnMarginComplete: true,
});

export const productIntelligenceService = {
  async getData(
    orgId: string,
    storeId: string,
    period: AnalyticsPeriod,
    query: {
      page?: number;
      pageSize?: number;
      categoryId?: string;
      brandId?: string;
      productStatus?: "active" | "inactive";
      status?: string;
      sort?: string;
      direction?: "asc" | "desc";
    } = {}
  ): Promise<ProductIntelligenceResponse> {
    const start = new Date(period.current.start);
    const end = new Date(period.current.end);
    const [inventory, sales, returns] = await Promise.all([
      inventoryIntelligenceService.getData(orgId, storeId, period),
      prisma.sale.findMany({
        where: {
          storeId,
          store: { orgId },
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          transactionDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          transactionDate: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              total: true,
              finalLineAmount: true,
              netLineAmount: true,
              originalUnitPrice: true,
              unitPrice: true,
              allocatedDiscount: true,
              costPrice: true,
            },
          },
        },
      }),
      prisma.returnTransaction.findMany({
        where: { storeId, store: { orgId }, businessDate: { gte: start, lt: end } },
        select: {
          businessDate: true,
          sale: {
            select: { items: { select: { productId: true, sizeId: true, costPrice: true } } },
          },
          items: {
            select: {
              returnedProductId: true,
              returnedSizeId: true,
              returnedQuantity: true,
              returnedLineAmount: true,
              returnedUnitPrice: true,
              newProductId: true,
              newQuantity: true,
              newUnitPrice: true,
              newCostPrice: true,
            },
          },
        },
      }),
    ]);
    const financial = new Map<string, Financial>();
    const lastSale = new Map<string, Date>();
    const get = (id: string) => {
      const row = financial.get(id) ?? emptyFinancial();
      financial.set(id, row);
      return row;
    };
    for (const sale of sales)
      for (const item of sale.items) {
        const row = get(item.productId);
        const revenue = resolveSaleLineRevenue(
          item.finalLineAmount == null ? null : Number(item.finalLineAmount),
          item.netLineAmount == null ? null : Number(item.netLineAmount),
          Number(item.total)
        );
        const gross = Number(item.originalUnitPrice ?? item.unitPrice) * item.quantity;
        row.revenue += revenue;
        row.units += item.quantity;
        row.orders.add(sale.id);
        row.discount += Math.max(0, Number(item.allocatedDiscount ?? 0), gross - revenue);
        if (item.costPrice == null) row.costComplete = false;
        else row.cogs += Number(item.costPrice) * item.quantity;
        if (!lastSale.get(item.productId) || lastSale.get(item.productId)! < sale.transactionDate)
          lastSale.set(item.productId, sale.transactionDate);
      }
    for (const transaction of returns) {
      const originalCosts = new Map(
        transaction.sale.items.map((item) => [
          `${item.productId}:${item.sizeId}`,
          item.costPrice == null ? null : Number(item.costPrice),
        ])
      );
      for (const item of transaction.items) {
        if (item.returnedProductId && item.returnedQuantity > 0) {
          const row = get(item.returnedProductId);
          const value = Number(
            item.returnedLineAmount ?? Number(item.returnedUnitPrice) * item.returnedQuantity
          );
          const cost = item.returnedSizeId
            ? originalCosts.get(`${item.returnedProductId}:${item.returnedSizeId}`)
            : null;
          row.revenue -= value;
          row.units -= item.returnedQuantity;
          row.returnedUnits += item.returnedQuantity;
          if (cost == null) {
            row.costComplete = false;
            row.returnMarginComplete = false;
          } else {
            row.cogs -= cost * item.returnedQuantity;
            row.returnMargin += value - cost * item.returnedQuantity;
          }
        }
        if (item.newProductId && (item.newQuantity ?? 0) > 0) {
          const row = get(item.newProductId);
          const quantity = item.newQuantity ?? 0;
          row.revenue += Number(item.newUnitPrice ?? 0) * quantity;
          row.units += quantity;
          if (item.newCostPrice == null) row.costComplete = false;
          else row.cogs += Number(item.newCostPrice) * quantity;
          if (
            !lastSale.get(item.newProductId) ||
            lastSale.get(item.newProductId)! < transaction.businessDate
          )
            lastSale.set(item.newProductId, transaction.businessDate);
        }
      }
    }
    const days = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
    const signalRows = inventory.products;
    const signalMap = new Map(signalRows.map((row) => [row.productId, row]));
    // Inventory service exposes the complete product set through its valuation/signals only in grouped views;
    // load lightweight product metadata and current stock to include products with no period activity.
    const [products, inboundItems] = await Promise.all([prisma.product.findMany({
      where: {
        orgId,
        OR: [
          { stockEntries: { some: { storeId } } },
          { saleItems: { some: { sale: { storeId, transactionDate: { gte: start, lt: end } } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        isActive: true,
        costPrice: true,
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        stockEntries: { where: { storeId }, select: { quantity: true } },
      },
    }), prisma.purchaseOrderItem.findMany({ where: { purchaseOrder: { storeId, store: { orgId }, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } } }, select: { productId: true, quantity: true, purchaseOrder: { select: { expectedDeliveryDate: true } }, receiptItems: { select: { quantityAccepted: true } } } })]);
    const inboundByProduct = new Map<string, { quantity: number; expectedDate: string | null; overdue: boolean }>();
    const today = new Date().toISOString().slice(0, 10);
    for (const item of inboundItems) { const accepted = item.receiptItems.reduce((sum, receipt) => sum + receipt.quantityAccepted, 0); const open = Math.max(0, item.quantity - accepted); if (!open) continue; const current = inboundByProduct.get(item.productId) ?? { quantity: 0, expectedDate: null, overdue: false }; const expected = item.purchaseOrder.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null; current.quantity += open; if (expected && (!current.expectedDate || expected < current.expectedDate)) current.expectedDate = expected; if (expected && expected < today) current.overdue = true; inboundByProduct.set(item.productId, current); }
    const rows: ProductIntelligenceRow[] = products.map((product) => {
      const f = financial.get(product.id) ?? emptyFinancial();
      const signal = signalMap.get(product.id);
      const currentQuantity =
        signal?.currentStock ??
        product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);
      const inventoryValue =
        signal?.inventoryValue ?? round(Math.max(0, currentQuantity) * Number(product.costPrice));
      const cogs = f.costComplete ? round(f.cogs) : null;
      const grossProfit = cogs == null ? null : round(f.revenue - cogs);
      const margin =
        grossProfit == null || f.revenue === 0 ? null : round((grossProfit / f.revenue) * 100, 1);
      const grossSales = f.revenue + f.discount;
      const discountRate = grossSales > 0 ? round((f.discount / grossSales) * 100, 1) : 0;
      const soldBeforeReturns = Math.max(0, f.units + f.returnedUnits);
      const returnRate =
        soldBeforeReturns > 0 ? round((f.returnedUnits / soldBeforeReturns) * 100, 1) : 0;
      const last =
        lastSale.get(product.id) ?? (signal?.lastSaleDate ? new Date(signal.lastSaleDate) : null);
      const daysSinceSale =
        signal?.daysSinceSale ??
        (last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : null);
      const inbound = inboundByProduct.get(product.id) ?? { quantity: 0, expectedDate: null, overdue: false };
      const decision = deriveProductDecision({
        productId: product.id,
        unitsSold: f.units,
        revenue: round(f.revenue),
        grossMarginPercent: margin,
        currentStock: currentQuantity,
        stockCoverDays: signal?.stockCoverDays ?? null,
        sellThrough: signal?.sellThrough ?? null,
        daysSinceSale,
        unfulfilledDemand: signal?.unfulfilledDemand ?? null,
        returnRate,
        discountRate,
        inboundQuantity: inbound.quantity, inboundExpectedDate: inbound.expectedDate, inboundOverdue: inbound.overdue,
      });
      return {
        productId: product.id,
        product: product.name,
        sku: product.sku,
        categoryId: product.category.id,
        category: product.category.name,
        brandId: product.brand.id,
        brand: product.brand.name,
        isActive: product.isActive,
        revenue: round(f.revenue),
        unitsSold: f.units,
        orders: f.orders.size,
        averageSellingPrice: f.units > 0 ? round(f.revenue / f.units) : null,
        cogs,
        grossProfit,
        grossMarginPercent: margin,
        currentQuantity,
        inboundQuantity: inbound.quantity,
        inboundExpectedDate: inbound.expectedDate,
        inboundOverdue: inbound.overdue,
        inventoryValue,
        salesVelocityPerDay: round(Math.max(0, f.units) / days, 3),
        stockCoverDays:
          signal?.stockCoverDays ??
          (f.units > 0 ? round(currentQuantity / (f.units / days), 1) : null),
        sellThrough: signal?.sellThrough ?? null,
        lastSaleDate: last?.toISOString() ?? null,
        lowStock: currentQuantity <= 2,
        slowMoving: decision.type === "SLOW_MOVING",
        deadStock: decision.type === "DEAD_STOCK",
        overstock: decision.type === "OVERSTOCK",
        observedDemand: signal?.observedDemand ?? null,
        fulfilledDemand:
          signal?.observedDemand == null
            ? null
            : Math.max(0, signal.observedDemand - (signal.unfulfilledDemand ?? 0)),
        unfulfilledDemand: signal?.unfulfilledDemand ?? null,
        returnRate,
        discountRate,
        marginLostToReturns: f.returnMarginComplete ? round(f.returnMargin) : null,
        discountAmount: round(f.discount),
        completeness: {
          cogs: f.costComplete ? "COMPLETE" : "UNAVAILABLE",
          reasons: f.costComplete
            ? []
            : ["One or more sale or replacement-exchange lines lack an immutable cost snapshot"],
        },
        decision,
      };
    });
    const allRows = rows.filter(
      (row) =>
        (!query.categoryId || row.categoryId === query.categoryId) &&
        (!query.brandId || row.brandId === query.brandId) &&
        (!query.productStatus || row.isActive === (query.productStatus === "active")) &&
        (!query.status || row.decision.type === query.status)
    );
    const sort = query.sort ?? "revenue";
    const direction = query.direction === "asc" ? 1 : -1;
    const value = (row: ProductIntelligenceRow) =>
      ({
        revenue: row.revenue,
        profit: row.grossProfit ?? -Infinity,
        margin: row.grossMarginPercent ?? -Infinity,
        stockValue: row.inventoryValue,
        cover: row.stockCoverDays ?? Infinity,
        demand: row.unfulfilledDemand ?? 0,
        returns: row.returnRate,
      })[sort] ?? row.revenue;
    allRows.sort((a, b) => direction * (value(a) - value(b)) || a.product.localeCompare(b.product));
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const page = Math.max(1, query.page ?? 1);
    const summaryTypes = rows.map((row) => row.decision.type);
    return {
      generatedAt: new Date().toISOString(),
      scope: inventory.scope,
      range: period.current,
      pointInTimeAt: new Date().toISOString(),
      items: allRows.slice((page - 1) * pageSize, page * pageSize),
      total: allRows.length,
      page,
      pageSize,
      summary: {
        reorder: summaryTypes.filter((x) => x === "REORDER").length,
        demandGap: summaryTypes.filter((x) => x === "DEMAND_GAP").length,
        slowMoving: summaryTypes.filter((x) => x === "SLOW_MOVING").length,
        deadStock: summaryTypes.filter((x) => x === "DEAD_STOCK").length,
        overstock: summaryTypes.filter((x) => x === "OVERSTOCK").length,
        highReturn: summaryTypes.filter((x) => x === "HIGH_RETURN").length,
        inboundStock: summaryTypes.filter((x) => x === "INBOUND_STOCK").length,
      },
      filters: {
        categories: [
          ...new Map(
            rows.map((r) => [r.categoryId, { id: r.categoryId, name: r.category }])
          ).values(),
        ],
        brands: [
          ...new Map(rows.map((r) => [r.brandId, { id: r.brandId, name: r.brand }])).values(),
        ],
      },
    };
  },
};
