import { prisma } from "@/lib/db";
import { resolveSaleLineRevenue } from "@/modules/inventory-intelligence/utils/metrics";
import { aggregateContribution, analyzeBaskets, detectLowMarginRows, tradingTime, type ContributionDimension, type OwnerLineEvent } from "./ownerAnalytics";

const number = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Number(value.toFixed(2));
const percent = (part: number, whole: number) => whole ? round(part / whole * 100) : 0;
const key = (productId: string, sizeId: string) => `${productId}:${sizeId}`;

export const ownerIntelligenceService = {
  async getStoreAnalysis(orgId: string, storeId: string, from: Date, endExclusive: Date, dimension: ContributionDimension) {
    const scope = { storeId, store: { orgId } };
    const [store, sales, returns, firstPurchases] = await Promise.all([
      prisma.store.findFirstOrThrow({ where: { id: storeId, orgId }, select: { id: true, name: true } }),
      prisma.sale.findMany({
        where: { ...scope, status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] }, transactionDate: { gte: from, lt: endExclusive } },
        select: {
          id: true, transactionDate: true, total: true, subtotal: true, discountAmount: true, customerId: true,
          customer: { select: { name: true, mobile: true } },
          items: { select: { productId: true, sizeId: true, quantity: true, total: true, finalLineAmount: true, netLineAmount: true, originalUnitPrice: true, unitPrice: true, allocatedDiscount: true, costPrice: true, product: { select: { name: true, category: { select: { name: true } }, brand: { select: { name: true } } } } } },
        }, orderBy: { transactionDate: "asc" },
      }),
      prisma.returnTransaction.findMany({
        where: { ...scope, businessDate: { gte: from, lt: endExclusive } },
        select: {
          id: true, type: true, businessDate: true, refundAmount: true, netAmount: true, discountAmount: true, customerId: true,
          sale: { select: { id: true, customerId: true, transactionDate: true, customer: { select: { name: true, mobile: true } }, items: { select: { productId: true, sizeId: true, costPrice: true } } } },
          items: { select: { returnedProductId: true, returnedSizeId: true, returnedQuantity: true, returnedUnitPrice: true, returnedLineAmount: true, newProductId: true, newQuantity: true, newUnitPrice: true, newCostPrice: true, returnedProduct: { select: { name: true, category: { select: { name: true } }, brand: { select: { name: true } } } }, newProduct: { select: { name: true, category: { select: { name: true } }, brand: { select: { name: true } } } } } },
        }, orderBy: { businessDate: "asc" },
      }),
      prisma.sale.groupBy({ by: ["customerId"], where: { ...scope, customerId: { not: null }, status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] }, transactionDate: { lt: endExclusive } }, _min: { transactionDate: true } }),
    ]);

    const firstPurchase = new Map(firstPurchases.flatMap((row) => row.customerId && row._min.transactionDate ? [[row.customerId, row._min.transactionDate] as const] : []));
    const events: OwnerLineEvent[] = [];
    const baskets: Array<{ orderId: string; products: Array<{ id: string; name: string }> }> = [];
    const tradingLines: Array<{ date: Date; orderId: string; revenue: number; units: number; cogs: number | null }> = [];
    const customerOrders: Array<{ customerId: string | null; segment: "new" | "repeat" | "walk-in"; orderId: string; revenue: number }> = [];
    for (const sale of sales) {
      const allocations = sale.items.reduce((sum, item) => sum + number(item.allocatedDiscount), 0);
      const base = sale.items.reduce((sum, item) => sum + number(item.total), 0);
      const customer = sale.customer?.name || sale.customer?.mobile || "Walk-in";
      const segment = !sale.customerId ? "walk-in" : firstPurchase.get(sale.customerId)?.getTime() === sale.transactionDate.getTime() ? "new" : "repeat";
      customerOrders.push({ customerId: sale.customerId, segment, orderId: sale.id, revenue: number(sale.total) });
      baskets.push({ orderId: sale.id, products: sale.items.map((item) => ({ id: item.productId, name: item.product.name })) });
      for (const item of sale.items) {
        const revenue = resolveSaleLineRevenue(item.finalLineAmount === null ? null : number(item.finalLineAmount), item.netLineAmount === null ? null : number(item.netLineAmount), number(item.total));
        const discount = allocations > 0 ? number(item.allocatedDiscount) : base > 0 ? number(sale.discountAmount) * number(item.total) / base : 0;
        const cogs = item.costPrice === null ? null : number(item.costPrice) * item.quantity;
        events.push({ date: sale.transactionDate, orderId: sale.id, productId: item.productId, product: item.product.name, category: item.product.category.name, brand: item.product.brand.name, customerId: sale.customerId, customer, revenue, cogs, units: item.quantity, discount, returnValue: 0, returnUnits: 0, returnCount: 0, exchangeCount: 0 });
        tradingLines.push({ date: sale.transactionDate, orderId: sale.id, revenue, units: item.quantity, cogs });
      }
    }
    for (const transaction of returns) {
      const costs = new Map(transaction.sale.items.map((item) => [key(item.productId, item.sizeId), item.costPrice === null ? null : number(item.costPrice)]));
      const customerId = transaction.customerId ?? transaction.sale.customerId;
      const customer = transaction.sale.customer?.name || transaction.sale.customer?.mobile || "Walk-in";
      const segment = !customerId ? "walk-in" : firstPurchase.get(customerId)?.getTime() === transaction.sale.transactionDate.getTime() ? "new" : "repeat";
      let customerAdjustment = 0;
      for (const item of transaction.items) {
        if (item.returnedProductId && item.returnedProduct && item.returnedQuantity > 0) {
          const value = number(item.returnedLineAmount ?? number(item.returnedUnitPrice) * item.returnedQuantity);
          const unitCost = item.returnedSizeId ? costs.get(key(item.returnedProductId, item.returnedSizeId)) : null;
          events.push({ date: transaction.businessDate, orderId: transaction.sale.id, productId: item.returnedProductId, product: item.returnedProduct.name, category: item.returnedProduct.category.name, brand: item.returnedProduct.brand.name, customerId, customer, revenue: -value, cogs: unitCost == null ? null : -unitCost * item.returnedQuantity, units: -item.returnedQuantity, discount: 0, returnValue: value, returnUnits: item.returnedQuantity, returnCount: transaction.type === "EXCHANGE" ? 0 : 1, exchangeCount: transaction.type === "RETURN" ? 0 : 1 });
          customerAdjustment -= value;
        }
        if (item.newProductId && item.newProduct && (item.newQuantity ?? 0) > 0) {
          const quantity = item.newQuantity ?? 0; const value = number(item.newUnitPrice) * quantity;
          events.push({ date: transaction.businessDate, orderId: transaction.sale.id, productId: item.newProductId, product: item.newProduct.name, category: item.newProduct.category.name, brand: item.newProduct.brand.name, customerId, customer, revenue: value, cogs: item.newCostPrice === null ? null : number(item.newCostPrice) * quantity, units: quantity, discount: 0, returnValue: 0, returnUnits: 0, returnCount: 0, exchangeCount: 1 });
          customerAdjustment += value;
        }
      }
      if (customerAdjustment !== 0) customerOrders.push({ customerId, segment, orderId: transaction.sale.id, revenue: customerAdjustment });
    }

    const contribution = aggregateContribution(events, dimension);
    const productContribution = aggregateContribution(events, "product");
    const productCategories = new Map(events.map((event) => [event.productId, event.category]));
    const productRows = productContribution.rows.map((row) => ({ id: row.id, name: row.name, category: productCategories.get(row.id) ?? "Uncategorised", revenue: row.revenue, grossMargin: row.grossMargin }));
    const saleCount = sales.length;
    const discountedSales = sales.filter((sale) => number(sale.discountAmount) > 0);
    const nondiscountedSales = sales.filter((sale) => number(sale.discountAmount) <= 0);
    const discounts = events.reduce((sum, event) => sum + event.discount, 0);
    const returnValue = events.reduce((sum, event) => sum + event.returnValue, 0);
    const returnUnits = events.reduce((sum, event) => sum + event.returnUnits, 0);
    const soldUnits = events.filter((event) => event.units > 0).reduce((sum, event) => sum + event.units, 0);
    const returnProfitImpactComplete = events.filter((event) => event.returnValue > 0).every((event) => event.cogs !== null);
    const returnProfitImpact = returnProfitImpactComplete ? round(events.filter((event) => event.returnValue > 0).reduce((sum, event) => sum + (-event.revenue + (event.cogs ?? 0)), 0)) : null;
    const segmentSummary = (segment: "new" | "repeat" | "walk-in") => {
      const rows = customerOrders.filter((row) => row.segment === segment); const revenue = rows.reduce((sum, row) => sum + row.revenue, 0); const orders = new Set(rows.filter((row) => row.revenue > 0).map((row) => row.orderId)).size;
      return { revenue: round(revenue), orders, averageOrderValue: orders ? round(revenue / orders) : 0 };
    };
    const totalRevenue = events.reduce((sum, event) => sum + event.revenue, 0);
    const identifiedRevenue = events.filter((event) => event.customerId).reduce((sum, event) => sum + event.revenue, 0);
    return {
      scope: { type: "STORE" as const, storeId: store.id, storeName: store.name },
      range: { from: from.toISOString(), toExclusive: endExclusive.toISOString() },
      methodology: { revenue: "Final billed line amounts, less returned lines, plus exchange replacement lines.", cogs: "Immutable sale-item and exchange replacement cost snapshots.", timezone: "Asia/Kolkata (UTC+05:30)", observational: true },
      contribution,
      leakage: {
        discounts: round(discounts), discountPercent: percent(discounts, totalRevenue + discounts), discountedInvoicePercent: percent(discountedSales.length, saleCount),
        discountedAov: discountedSales.length ? round(discountedSales.reduce((sum, sale) => sum + number(sale.total), 0) / discountedSales.length) : 0,
        nonDiscountedAov: nondiscountedSales.length ? round(nondiscountedSales.reduce((sum, sale) => sum + number(sale.total), 0) / nondiscountedSales.length) : 0,
        returnValue: round(returnValue), returnUnits, returnRate: percent(returnUnits, soldUnits), returnProfitImpact,
        exchanges: returns.filter((row) => row.type !== "RETURN").length,
        lowMarginRows: detectLowMarginRows(productRows, totalRevenue),
      },
      trading: tradingTime(tradingLines),
      baskets: analyzeBaskets(baskets),
      customerMix: {
        totalRevenue: round(totalRevenue), identifiedRevenue: round(identifiedRevenue), walkInRevenue: round(totalRevenue - identifiedRevenue),
        identifiedShare: percent(identifiedRevenue, totalRevenue), walkInShare: percent(totalRevenue - identifiedRevenue, totalRevenue),
        new: segmentSummary("new"), repeat: segmentSummary("repeat"), walkIn: segmentSummary("walk-in"), returnsAdjusted: true,
      },
    };
  },
};
