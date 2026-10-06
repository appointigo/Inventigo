import { prisma } from "@/lib/db";
import { businessDateForInstant } from "@/modules/analytics/utils/dateRange";
import { resolveSaleLineRevenue } from "@/modules/inventory-intelligence/utils/metrics";
import { businessDaysBetween, costChange, deliveryTiming, fillRate, outstandingQuantity } from "./procurementRules";

const n = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Number(value.toFixed(2));

export const procurementIntelligenceService = {
  async get(orgId: string, storeId: string, from: Date, endExclusive: Date) {
    const [store, orders, stock, associations] = await Promise.all([
      prisma.store.findFirstOrThrow({ where: { id: storeId, orgId }, select: { id: true, name: true } }),
      prisma.purchaseOrder.findMany({
        where: { storeId, store: { orgId }, OR: [{ status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } }, { orderedAt: { gte: from, lt: endExclusive } }, { receipts: { some: { receivedAt: { gte: from, lt: endExclusive } } } }] },
        select: { id: true, supplierId: true, status: true, totalAmount: true, orderedAt: true, receivedAt: true, expectedDeliveryDate: true, createdAt: true, supplier: { select: { name: true } }, items: { select: { id: true, productId: true, sizeId: true, quantity: true, unitCost: true, product: { select: { name: true, category: { select: { name: true } } } }, receiptItems: { select: { quantityReceived: true, quantityAccepted: true, quantityRejected: true, quantityDamaged: true, unitCostActual: true, receipt: { select: { receivedAt: true } } } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockEntry.findMany({ where: { storeId, store: { orgId } }, select: { productId: true, sizeId: true, quantity: true } }),
      prisma.productSupplier.findMany({
        where: { isActive: true, supplier: { orgId } },
        select: {
          id: true,
          supplier: { select: { name: true } },
          product: {
            select: {
              id: true, name: true, costPrice: true,
              productSuppliers: { where: { isActive: true }, select: { supplierId: true } },
              stockEntries: { where: { storeId }, select: { quantity: true } },
              saleItems: {
                where: { sale: { storeId, transactionDate: { gte: from, lt: endExclusive }, status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] } } },
                select: { quantity: true, total: true, finalLineAmount: true, netLineAmount: true, costPrice: true },
              },
            },
          },
        },
      }),
    ]);
    const today = businessDateForInstant();
    const poRows = orders.map((order) => {
      const accepted = order.items.reduce((sum, item) => sum + item.receiptItems.reduce((lineSum, receipt) => lineSum + receipt.quantityAccepted, 0), 0);
      const ordered = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const rejected = order.items.reduce((sum, item) => sum + item.receiptItems.reduce((lineSum, receipt) => lineSum + receipt.quantityRejected + receipt.quantityDamaged, 0), 0);
      const outstanding = outstandingQuantity(ordered, accepted);
      const overdue = Boolean(order.expectedDeliveryDate && order.expectedDeliveryDate.toISOString().slice(0, 10) < today && outstanding > 0 && order.status !== "CANCELLED");
      const receivedValue = order.items.reduce((sum, item) => sum + item.receiptItems.reduce((lineSum, receipt) => lineSum + receipt.quantityAccepted * n(receipt.unitCostActual ?? item.unitCost), 0), 0);
      return { id: order.id, supplier: order.supplier.name, orderDate: order.orderedAt?.toISOString() ?? order.createdAt.toISOString(), expectedDate: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null, orderedValue: n(order.totalAmount), receivedValue: round(receivedValue), orderedUnits: ordered, acceptedUnits: accepted, rejectedDamagedUnits: rejected, outstandingUnits: outstanding, fillPercent: fillRate(ordered, accepted), daysLate: overdue && order.expectedDeliveryDate ? Math.max(0, businessDaysBetween(order.expectedDeliveryDate, new Date())) : 0, status: overdue ? "OVERDUE" : order.status, legacyIncomplete: order.status === "RECEIVED" && order.items.every((item) => item.receiptItems.length === 0) };
    });
    const suppliers = new Map<string, { id: string; supplier: string; spend: number; orders: Set<string>; ordered: number; accepted: number; rejected: number; openValue: number; outstanding: number; onTime: boolean[]; leadTimes: number[]; products: Set<string> }>();
    const costs = new Map<string, Array<{ date: Date; cost: number; supplier: string; product: string; category: string }>>();
    for (const order of orders) {
      const supplier = suppliers.get(order.supplierId) ?? { id: order.supplierId, supplier: order.supplier.name, spend: 0, orders: new Set(), ordered: 0, accepted: 0, rejected: 0, openValue: 0, outstanding: 0, onTime: [], leadTimes: [], products: new Set() };
      supplier.orders.add(order.id); supplier.spend += n(order.totalAmount);
      const completion = order.receivedAt ?? null; const timing = deliveryTiming(order.expectedDeliveryDate, completion);
      if (timing.onTime !== null) supplier.onTime.push(timing.onTime);
      if (order.orderedAt && completion) supplier.leadTimes.push(businessDaysBetween(order.orderedAt, completion));
      for (const item of order.items) {
        const accepted = item.receiptItems.reduce((sum, receipt) => sum + receipt.quantityAccepted, 0); const outstanding = outstandingQuantity(item.quantity, accepted);
        supplier.ordered += item.quantity; supplier.accepted += accepted; supplier.rejected += item.receiptItems.reduce((sum, receipt) => sum + receipt.quantityRejected + receipt.quantityDamaged, 0); supplier.outstanding += outstanding; supplier.openValue += outstanding * n(item.unitCost); supplier.products.add(item.productId);
        for (const receipt of item.receiptItems.filter((row) => row.unitCostActual !== null && row.receipt.receivedAt >= from && row.receipt.receivedAt < endExclusive)) {
          const key = `${order.supplierId}:${item.productId}`; costs.set(key, [...(costs.get(key) ?? []), { date: receipt.receipt.receivedAt, cost: n(receipt.unitCostActual), supplier: order.supplier.name, product: item.product.name, category: item.product.category.name }]);
        }
      }
      suppliers.set(order.supplierId, supplier);
    }
    const supplierRows = [...suppliers.values()].map((row) => ({ id: row.id, supplier: row.supplier, spend: round(row.spend), orders: row.orders.size, orderedUnits: row.ordered, acceptedUnits: row.accepted, rejectedDamagedUnits: row.rejected, currentFulfilment: fillRate(row.ordered, row.accepted), onTimeRate: row.onTime.length ? round(row.onTime.filter(Boolean).length / row.onTime.length * 100) : null, expectedDateCompleteness: row.orders.size ? round(row.onTime.length / row.orders.size * 100) : 0, averageLeadTime: row.leadTimes.length ? round(row.leadTimes.reduce((a, b) => a + b, 0) / row.leadTimes.length) : null, openPoValue: round(row.openValue), outstandingUnits: row.outstanding, productsSupplied: row.products.size }));
    const costRows = [...costs.values()].map((values) => { const sorted = values.toSorted((a, b) => a.date.getTime() - b.date.getTime()); const latest = sorted.at(-1)!; const previous = sorted.at(-2); return { id: `${latest.supplier}:${latest.product}`, supplier: latest.supplier, product: latest.product, category: latest.category, latestCost: latest.cost, previousCost: previous?.cost ?? null, changePercent: costChange(previous?.cost ?? null, latest.cost), averageCost: round(sorted.reduce((sum, row) => sum + row.cost, 0) / sorted.length), lowestCost: Math.min(...sorted.map((row) => row.cost)), highestCost: Math.max(...sorted.map((row) => row.cost)), observations: sorted.length }; });
    const stockMap = new Map(stock.map((row) => [`${row.productId}:${row.sizeId}`, row.quantity]));
    const inbound = orders.flatMap((order) => order.items.map((item) => { const accepted = item.receiptItems.reduce((sum, receipt) => sum + receipt.quantityAccepted, 0); const open = outstandingQuantity(item.quantity, accepted); return { id: item.id, productId: item.productId, product: item.product.name, sizeId: item.sizeId, currentStock: stockMap.get(`${item.productId}:${item.sizeId}`) ?? 0, openPoQuantity: open, effectiveFutureStock: (stockMap.get(`${item.productId}:${item.sizeId}`) ?? 0) + open, expectedReceipt: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null, poId: order.id, supplier: order.supplier.name, overdue: Boolean(order.expectedDeliveryDate && order.expectedDeliveryDate.toISOString().slice(0, 10) < today && open > 0) }; })).filter((row) => row.openPoQuantity > 0);
    const actions = poRows.flatMap((po) => [
      ...(po.status === "OVERDUE" ? [{ id: `overdue:${po.id}`, type: "OVERDUE_PO", severity: "HIGH", title: `${po.id.slice(0, 8).toUpperCase()} — Overdue`, reason: `${po.outstandingUnits} units outstanding · ${po.daysLate} days late · ${po.supplier}`, poId: po.id }] : []),
      ...(po.status === "PARTIALLY_RECEIVED" ? [{ id: `partial:${po.id}`, type: "PARTIAL_RECEIPT", severity: "MEDIUM", title: `${po.id.slice(0, 8).toUpperCase()} — Partial receipt`, reason: `${po.acceptedUnits}/${po.orderedUnits} accepted; ${po.outstandingUnits} outstanding`, poId: po.id }] : []),
      ...(po.rejectedDamagedUnits > 0 ? [{ id: `reject:${po.id}`, type: po.rejectedDamagedUnits / Math.max(1, po.acceptedUnits + po.rejectedDamagedUnits) >= .1 ? "HIGH_REJECTION" : "REJECTION_EVIDENCE", severity: po.rejectedDamagedUnits / Math.max(1, po.acceptedUnits + po.rejectedDamagedUnits) >= .1 ? "HIGH" : "MEDIUM", title: `${po.id.slice(0, 8).toUpperCase()} — Rejection or damage`, reason: `${po.rejectedDamagedUnits} units rejected/damaged · ${po.supplier}`, poId: po.id }] : []),
      ...(po.legacyIncomplete ? [{ id: `legacy:${po.id}`, type: "LEGACY_INCOMPLETE", severity: "LOW", title: `${po.id.slice(0, 8).toUpperCase()} — Legacy receipt evidence`, reason: "Marked received before granular receipt evidence was introduced", poId: po.id }] : []),
    ]);
    for (const row of costRows.filter((cost) => (cost.changePercent ?? 0) >= 10)) actions.push({ id: `cost:${row.id}`, type: "COST_INCREASE", severity: "MEDIUM", title: `${row.product} — Purchase cost increased`, reason: `${row.previousCost} → ${row.latestCost} (${row.changePercent}%) · ${row.supplier}`, poId: "" });
    for (const row of inbound.filter((item) => item.currentStock <= 2)) actions.push({ id: `inbound:${row.id}`, type: row.overdue ? "INBOUND_AT_RISK" : "STOCK_NEEDED_ALREADY_INBOUND", severity: row.overdue ? "HIGH" : "LOW", title: `${row.product} — ${row.overdue ? "Inbound at risk" : "Stock already inbound"}`, reason: `${row.currentStock} current · ${row.openPoQuantity} inbound · ${row.expectedReceipt ?? "expected date missing"}`, poId: row.poId });
    const supplierProducts = associations.map((association) => { const revenue = association.product.saleItems.reduce((sum, item) => sum + resolveSaleLineRevenue(item.finalLineAmount === null ? null : n(item.finalLineAmount), item.netLineAmount === null ? null : n(item.netLineAmount), n(item.total)), 0); const costComplete = association.product.saleItems.every((item) => item.costPrice !== null); const cogs = costComplete ? association.product.saleItems.reduce((sum, item) => sum + n(item.costPrice) * item.quantity, 0) : null; const stockUnits = association.product.stockEntries.reduce((sum, item) => sum + item.quantity, 0); return { id: association.id, supplier: association.supplier.name, product: association.product.name, association: association.product.productSuppliers.length === 1 ? "SOLE_CURRENT_ASSOCIATION" : "MULTIPLE_CURRENT_SUPPLIERS", unitsSold: association.product.saleItems.reduce((sum, item) => sum + item.quantity, 0), revenue: round(revenue), grossProfit: cogs === null ? null : round(revenue - cogs), currentStock: stockUnits, inventoryValue: round(Math.max(0, stockUnits) * n(association.product.costPrice)) }; });
    const summary = { openPoCount: poRows.filter((row) => ["ORDERED", "PARTIALLY_RECEIVED", "OVERDUE"].includes(row.status)).length, openPoValue: round(poRows.reduce((sum, row) => sum + Math.max(0, row.orderedValue - row.receivedValue), 0)), outstandingUnits: poRows.reduce((sum, row) => sum + row.outstandingUnits, 0), partiallyReceived: poRows.filter((row) => row.status === "PARTIALLY_RECEIVED").length, overdue: poRows.filter((row) => row.status === "OVERDUE").length, expectedInboundValue: round(inbound.reduce((sum, row) => { const item = orders.flatMap((order) => order.items).find((candidate) => candidate.id === row.id); return sum + row.openPoQuantity * n(item?.unitCost); }, 0)), acceptedReceivedValue: round(poRows.reduce((sum, row) => sum + row.receivedValue, 0)), rejectedDamagedUnits: poRows.reduce((sum, row) => sum + row.rejectedDamagedUnits, 0) };
    return { scope: { type: "STORE", storeId: store.id, storeName: store.name }, range: { from: from.toISOString(), toExclusive: endExclusive.toISOString() }, summary, purchaseOrders: poRows, suppliers: supplierRows, costs: costRows, inbound, actions, supplierProducts, completeness: { expectedDates: poRows.length ? round(poRows.filter((row) => row.expectedDate).length / poRows.length * 100) : 100, legacyReceipts: poRows.filter((row) => row.legacyIncomplete).length }, methodology: { fillRate: "Accepted quantity divided by ordered quantity. Open quantities not yet due are shown as current fulfilment, not closed fill rate.", costs: "Actual unit costs recorded on receipt lines; Product.costPrice is not used as history.", supplierProduct: "Product results are labelled current supplier association, not supplier ROI, because receipt-lot sales attribution does not exist." } };
  },
};
