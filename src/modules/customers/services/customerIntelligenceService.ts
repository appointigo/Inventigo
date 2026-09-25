import "server-only";
import { prisma } from "@/lib/db";

const DAY_MS = 86_400_000;
const daysAgo = (date: Date, now: Date) => Math.floor((now.getTime() - date.getTime()) / DAY_MS);

export const customerIntelligenceService = {
  async insights(orgId: string, storeId?: string | null) {
    const customers = await prisma.customer.findMany({
      where: { orgId, ...(storeId ? { OR: [{ preferredStoreId: storeId }, { sales: { some: { storeId } } }] } : {}) },
      select: {
        id: true,
        preferredStoreId: true,
        sales: {
          where: { status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] } },
          select: { id: true, total: true, transactionDate: true, returnTransactions: { select: { type: true, netAmount: true, refundAmount: true } } },
        },
        followUps: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { id: true } },
      },
    });
    const now = new Date();
    const metrics = customers.map(customer => {
      const orders = customer.sales.map(sale => {
        const adjustment = sale.returnTransactions.reduce((sum, transaction) => transaction.type === "RETURN" ? sum - Number(transaction.refundAmount) : sum + Number(transaction.netAmount) - Number(transaction.refundAmount), 0);
        return { date: sale.transactionDate, retained: Math.max(0, Number(sale.total) + adjustment) };
      }).filter(order => order.retained > 0).sort((a, b) => a.date.getTime() - b.date.getTime());
      const last = orders.at(-1)?.date ?? null;
      const recency = last ? daysAgo(last, now) : null;
      return { orders: orders.length, netSpend: orders.reduce((sum, order) => sum + order.retained, 0), last, active: recency !== null && recency <= 90, attention: customer.followUps.length > 0 || (recency !== null && recency > 90), lead: orders.length === 0 };
    });
    const purchasers = metrics.filter(item => item.orders > 0);
    const repeat = purchasers.filter(item => item.orders >= 2);
    const highValueCount = purchasers.length ? Math.max(1, Math.ceil(purchasers.length * 0.2)) : 0;
    const restockReady = await prisma.demandRequest.count({
      where: { orgId, status: { in: ["UNFULFILLED", "PARTIALLY_FULFILLED"] }, ...(storeId ? { storeId } : {}), product: { stockEntries: { some: { quantity: { gt: 0 }, ...(storeId ? { storeId } : {}) } } } },
    });
    return {
      generatedAt: now.toISOString(),
      activeCustomers: metrics.filter(item => item.active).length,
      totalCustomers: metrics.length,
      repeatCustomers: repeat.length,
      highValueCustomers: highValueCount,
      atRiskCustomers: metrics.filter(item => item.attention && !item.lead).length,
      repeatPurchaseRate: purchasers.length ? repeat.length / purchasers.length : 0,
      attentionNeeded: metrics.filter(item => item.attention).length,
      restockMatches: restockReady,
      customersWithPurchases: purchasers.length,
      leads: metrics.filter(item => item.lead).length,
      lifetimeNetSpend: metrics.reduce((sum, item) => sum + item.netSpend, 0),
    };
  },
};
