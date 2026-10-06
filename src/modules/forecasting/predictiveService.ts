import "server-only";
import { prisma } from "@/lib/db";
import { businessDateForInstant } from "@/modules/analytics/utils/dateRange";
import { businessDaysBetween } from "@/modules/procurement-intelligence/procurementRules";
import {
  customerReturnSignal,
  supplierDeliveryRisk,
  validateCustomerReturnSignals,
} from "./forecastRules";

export const predictiveService = {
  async customerSignals(orgId: string, storeId: string, now = new Date()) {
    const asOf = businessDateForInstant(now);
    const historyStart = new Date(now.getTime() - 730 * 86_400_000);
    const customers = await prisma.customer.findMany({
      where: { orgId, sales: { some: { storeId } } },
      select: {
        id: true,
        name: true,
        mobile: true,
        totalSpent: true,
        sales: {
          where: {
            storeId,
            transactionDate: { gte: historyStart },
            status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          },
          select: { transactionDate: true, total: true },
          orderBy: { transactionDate: "asc" },
        },
        visits: {
          where: { storeId },
          select: { visitedAt: true },
          orderBy: { visitedAt: "desc" },
          take: 1,
        },
        followUps: {
          where: { storeId, status: { in: ["OPEN", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
    });
    const items = customers.map((customer) => {
      const dates = customer.sales.map((sale) => businessDateForInstant(sale.transactionDate));
      const signal = customerReturnSignal(dates, asOf);
      return {
        customerId: customer.id,
        customer: customer.name || customer.mobile,
        mobile: customer.mobile,
        orderCount: customer.sales.length,
        retainedValue: customer.sales.reduce((sum, sale) => sum + Number(sale.total), 0),
        lastPurchase: dates.at(-1) ?? null,
        lastVisit: customer.visits[0]?.visitedAt.toISOString() ?? null,
        openFollowUps: customer.followUps.length,
        ...signal,
        validation: validateCustomerReturnSignals(dates),
        reasons:
          signal.status === "INSUFFICIENT_HISTORY"
            ? ["At least three distinct purchase dates are required"]
            : [
                `Typical purchase interval is ${signal.typicalIntervalDays} days`,
                signal.overdueDays
                  ? `Return is overdue by approximately ${signal.overdueDays} days`
                  : "Customer remains within the typical return window",
              ],
      };
    });
    const priority = {
      LIKELY_DORMANT: 3,
      RETURN_DUE: 2,
      ACTIVE: 1,
      INSUFFICIENT_HISTORY: 0,
    } as const;
    items.sort(
      (a, b) => priority[b.status] - priority[a.status] || b.retainedValue - a.retainedValue
    );
    return {
      asOf,
      summary: {
        returnDue: items.filter((row) => row.status === "RETURN_DUE").length,
        likelyDormant: items.filter((row) => row.status === "LIKELY_DORMANT").length,
        active: items.filter((row) => row.status === "ACTIVE").length,
        insufficientHistory: items.filter((row) => row.status === "INSUFFICIENT_HISTORY").length,
      },
      methodology:
        "Median inter-purchase cadence with a variation buffer. This is return/dormancy evidence, not a churn probability. Historical return-within-window rates are shown when samples exist.",
      items,
    };
  },

  async supplierRisks(orgId: string, storeId: string, now = new Date()) {
    const asOf = businessDateForInstant(now);
    const historyStart = new Date(now.getTime() - 730 * 86_400_000);
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        storeId,
        store: { orgId },
        OR: [
          { status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } },
          { receivedAt: { gte: historyStart } },
        ],
      },
      select: {
        id: true,
        supplierId: true,
        status: true,
        orderedAt: true,
        receivedAt: true,
        expectedDeliveryDate: true,
        supplier: { select: { name: true } },
        items: { select: { quantity: true, receiptItems: { select: { quantityAccepted: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const history = new Map<string, number[]>();
    for (const order of orders)
      if (order.orderedAt && order.receivedAt)
        history.set(order.supplierId, [
          ...(history.get(order.supplierId) ?? []),
          businessDaysBetween(order.orderedAt, order.receivedAt),
        ]);
    const items = orders
      .filter((order) => ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status))
      .map((order) => {
        const outstanding = order.items.reduce(
          (sum, item) =>
            sum +
            Math.max(
              0,
              item.quantity -
                item.receiptItems.reduce(
                  (received, receipt) => received + receipt.quantityAccepted,
                  0
                )
            ),
          0
        );
        const risk = supplierDeliveryRisk({
          leadTimes: history.get(order.supplierId) ?? [],
          orderedAt: businessDateForInstant(order.orderedAt ?? order.receivedAt ?? now),
          expectedDate: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
          asOf,
        });
        return {
          poId: order.id,
          supplierId: order.supplierId,
          supplier: order.supplier.name,
          expectedDate: order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
          outstandingUnits: outstanding,
          samples: history.get(order.supplierId)?.length ?? 0,
          ...risk,
        };
      })
      .filter((row) => row.outstandingUnits > 0);
    return {
      asOf,
      summary: {
        onTrack: items.filter((row) => row.status === "ON_TRACK").length,
        atRisk: items.filter((row) => row.status === "AT_RISK").length,
        overdue: items.filter((row) => row.status === "OVERDUE").length,
        insufficientHistory: items.filter((row) => row.status === "INSUFFICIENT_HISTORY").length,
      },
      methodology:
        "Open POs are compared with supplier median lead time, observed variation, elapsed duration and explicit expected dates. No failure probability is claimed.",
      items,
    };
  },

  async organizationOutlook(orgId: string, now = new Date()) {
    const stores = await prisma.store.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
    });
    const storeResults = await Promise.all(
      stores.map(async (store) => {
        const [forecasts, customers, suppliers] = await Promise.all([
          prisma.demandForecast
            .findFirst({
              where: { orgId, storeId: store.id, horizonDays: 30 },
              orderBy: { snapshotDate: "desc" },
              select: { snapshotDate: true },
            })
            .then((latestSnapshot) =>
              latestSnapshot
                ? prisma.demandForecast.findMany({
                    where: {
                      orgId,
                      storeId: store.id,
                      horizonDays: 30,
                      snapshotDate: latestSnapshot.snapshotDate,
                    },
                    include: { product: { select: { costPrice: true } } },
                  })
                : []
            ),
          this.customerSignals(orgId, store.id, now),
          this.supplierRisks(orgId, store.id, now),
        ]);
        const latest = new Map<string, (typeof forecasts)[number]>();
        for (const forecast of forecasts) {
          const id = `${forecast.productId}:${forecast.sizeId}`;
          if (!latest.has(id)) latest.set(id, forecast);
        }
        const rows = [...latest.values()];
        return {
          store,
          highStockoutRisk: rows.filter((row) =>
            ["CRITICAL", "HIGH"].includes(
              String((row.evidence as Record<string, { risk?: string }>).stockout?.risk)
            )
          ).length,
          likelyOverstockValue: rows.reduce((sum, row) => {
            const evidence = row.evidence as Record<string, unknown>;
            return (
              sum +
              Math.max(0, Number(evidence.currentStock ?? 0) - Number(row.upperBound ?? 0)) *
                Number(row.product.costPrice)
            );
          }, 0),
          deliveryRisk: suppliers.summary.atRisk + suppliers.summary.overdue,
          overdueCustomers: customers.summary.returnDue + customers.summary.likelyDormant,
        };
      })
    );
    return {
      generatedAt: now.toISOString(),
      totals: {
        highStockoutRisk: storeResults.reduce((sum, row) => sum + row.highStockoutRisk, 0),
        likelyOverstockValue: Number(
          storeResults.reduce((sum, row) => sum + row.likelyOverstockValue, 0).toFixed(2)
        ),
        deliveryRisk: storeResults.reduce((sum, row) => sum + row.deliveryRisk, 0),
        overdueCustomers: storeResults.reduce((sum, row) => sum + row.overdueCustomers, 0),
      },
      stores: storeResults,
      limitations: [
        "Only latest stored 30-day forecasts are included.",
        "Customer signals use explainable cadence, not churn prediction.",
        "Supplier risk is evidence-based and does not estimate failure probability.",
      ],
    };
  },
};
