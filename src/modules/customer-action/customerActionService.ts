import { prisma } from "@/lib/db";
import type { AnalyticsPeriod } from "@/modules/inventory-intelligence/types";
import { deriveCustomerAction, segmentCustomer, type CustomerActionType } from "./customerSegments";
import type { CustomerActionResponse, CustomerActionRow } from "./types";

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("en-IN");
const mostCommon = (values: string[]) => {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

export const customerActionService = {
  async getData(
    orgId: string,
    storeId: string,
    period: AnalyticsPeriod,
    query: { page?: number; pageSize?: number; queue?: CustomerActionType } = {}
  ): Promise<CustomerActionResponse> {
    const now = new Date();
    const store = await prisma.store.findFirst({
      where: { id: storeId, orgId, isActive: true },
      select: { id: true, name: true },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");
    const [customers, stock] = await Promise.all([
      prisma.customer.findMany({
        where: {
          orgId,
          OR: [
            { sales: { some: { storeId } } },
            { visits: { some: { storeId } } },
            { followUps: { some: { storeId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          mobile: true,
          sales: {
            where: { storeId, status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] } },
            select: {
              id: true,
              transactionDate: true,
              total: true,
              discountAmount: true,
              items: {
                select: {
                  quantity: true,
                  costPrice: true,
                  product: {
                    select: {
                      category: { select: { name: true } },
                      brand: { select: { name: true } },
                    },
                  },
                  size: { select: { label: true } },
                },
              },
            },
            orderBy: { transactionDate: "asc" },
          },
          returnTransactions: {
            where: { storeId },
            select: {
              businessDate: true,
              refundAmount: true,
              items: { select: { returnedQuantity: true } },
            },
          },
          visits: {
            where: { storeId },
            select: {
              visitedAt: true,
              demandRequests: {
                select: {
                  productId: true,
                  requestedQuantity: true,
                  fulfilledQuantity: true,
                  attributes: true,
                },
              },
            },
            orderBy: { visitedAt: "desc" },
          },
          followUps: {
            where: { storeId, status: { in: ["OPEN", "IN_PROGRESS"] } },
            select: { dueAt: true },
          },
          preferredStore: { select: { name: true } },
          whatsappContact: {
            select: {
              consents: {
                where: { purpose: "MARKETING" },
                select: { status: true },
                orderBy: { recordedAt: "desc" },
                take: 1,
              },
              conversations: {
                where: { storeId },
                select: { lastMessageAt: true },
                orderBy: { lastMessageAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.stockEntry.findMany({
        where: { storeId, store: { orgId }, quantity: { gt: 0 } },
        select: { productId: true, quantity: true, size: { select: { label: true } } },
      }),
    ]);
    const start = new Date(period.current.start);
    const end = new Date(period.current.end);
    const rows: CustomerActionRow[] = customers.map((customer) => {
      const sales = customer.sales;
      const refunds = customer.returnTransactions.reduce(
        (sum, item) => sum + Number(item.refundAmount),
        0
      );
      const retainedRevenue = round(
        sales.reduce((sum, sale) => sum + Number(sale.total), 0) - refunds
      );
      const periodRefunds = customer.returnTransactions
        .filter(
          (transaction) => transaction.businessDate >= start && transaction.businessDate < end
        )
        .reduce((sum, transaction) => sum + Number(transaction.refundAmount), 0);
      const periodRevenue = round(
        sales
          .filter((sale) => sale.transactionDate >= start && sale.transactionDate < end)
          .reduce((sum, sale) => sum + Number(sale.total), 0) - periodRefunds
      );
      const dates = sales.map((sale) => sale.transactionDate);
      const gaps = dates
        .slice(1)
        .map((date, index) => (date.getTime() - dates[index].getTime()) / 86_400_000);
      const allItems = sales.flatMap((sale) => sale.items);
      const costComplete =
        allItems.length > 0 &&
        customer.returnTransactions.length === 0 &&
        allItems.every((item) => item.costPrice !== null);
      const cogs = allItems.reduce(
        (sum, item) => sum + (item.costPrice === null ? 0 : Number(item.costPrice) * item.quantity),
        0
      );
      let unfulfilledDemand = 0;
      let restockAvailable = false;
      for (const request of customer.visits.flatMap((visit) => visit.demandRequests)) {
        const unfulfilled = Math.max(0, request.requestedQuantity - request.fulfilledQuantity);
        unfulfilledDemand += unfulfilled;
        if (!unfulfilled || !request.productId) continue;
        const attrs = request.attributes as Record<string, unknown>;
        const requestedSize = Object.entries(attrs).find(([key]) => normalize(key) === "size")?.[1];
        if (
          stock.some(
            (entry) =>
              entry.productId === request.productId &&
              (!requestedSize || normalize(entry.size.label) === normalize(requestedSize))
          )
        )
          restockAvailable = true;
      }
      const overdueFollowUps = customer.followUps.filter(
        (followUp) => followUp.dueAt && followUp.dueAt < now
      ).length;
      const input = {
        customerId: customer.id,
        orderCount: sales.length,
        retainedRevenue,
        lastPurchaseAt: dates.at(-1) ?? null,
        averageDaysBetweenPurchases: gaps.length
          ? round(gaps.reduce((a, b) => a + b, 0) / gaps.length, 1)
          : null,
        discountUsageRate: sales.length
          ? round(
              (sales.filter((sale) => Number(sale.discountAmount) > 0).length / sales.length) * 100,
              1
            )
          : 0,
        unfulfilledDemand,
        restockAvailable,
        overdueFollowUps,
        now,
      };
      const returned = customer.returnTransactions.reduce(
        (sum, transaction) =>
          sum + transaction.items.reduce((total, item) => total + item.returnedQuantity, 0),
        0
      );
      const sold = allItems.reduce((sum, item) => sum + item.quantity, 0);
      return {
        customerId: customer.id,
        customer: customer.name || customer.mobile,
        mobile: customer.mobile,
        lastPurchaseDate: dates.at(-1)?.toISOString() ?? null,
        firstPurchaseDate: dates[0]?.toISOString() ?? null,
        orderCount: sales.length,
        retainedRevenue,
        periodRevenue,
        averageOrderValue: sales.length ? round(retainedRevenue / sales.length) : 0,
        purchaseFrequency:
          dates.length > 1
            ? round(
                dates.length /
                  Math.max(1, (dates.at(-1)!.getTime() - dates[0].getTime()) / (30 * 86_400_000)),
                2
              )
            : dates.length,
        averageDaysBetweenPurchases: input.averageDaysBetweenPurchases,
        historicalGrossProfit: costComplete ? round(retainedRevenue - cogs) : null,
        profitCompleteness: costComplete
          ? "COMPLETE"
          : allItems.some((item) => item.costPrice !== null)
            ? "PARTIAL"
            : "UNAVAILABLE",
        preferredStore: customer.preferredStore?.name ?? store.name,
        preferredCategory: mostCommon(allItems.map((item) => item.product.category.name)),
        preferredBrand: mostCommon(allItems.map((item) => item.product.brand.name)),
        preferredSize: mostCommon(allItems.map((item) => item.size.label)),
        returnCount: returned,
        returnRate: sold ? round((returned / sold) * 100, 1) : 0,
        discountUsageRate: input.discountUsageRate,
        unfulfilledDemand,
        openFollowUps: customer.followUps.length,
        overdueFollowUps,
        lastVisit: customer.visits[0]?.visitedAt.toISOString() ?? null,
        lastWhatsAppActivity:
          customer.whatsappContact?.conversations[0]?.lastMessageAt.toISOString() ?? null,
        marketingConsent: customer.whatsappContact?.consents[0]?.status === "GRANTED",
        segments: segmentCustomer(input),
        action: deriveCustomerAction(input),
      };
    });
    const counts = {
      ALL: rows.length,
      DEMAND_FOLLOW_UP: 0,
      OVERDUE_FOLLOW_UP: 0,
      HIGH_VALUE_DORMANT: 0,
      REPEAT_CUSTOMER_DUE: 0,
      VIP: 0,
      WELCOME: 0,
    } satisfies Record<CustomerActionType | "ALL", number>;
    rows.forEach((row) => counts[row.action.type]++);
    const filtered = query.queue ? rows.filter((row) => row.action.type === query.queue) : rows;
    const severity = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
    filtered.sort(
      (a, b) =>
        severity[b.action.severity] - severity[a.action.severity] ||
        b.retainedRevenue - a.retainedRevenue
    );
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    return {
      generatedAt: now.toISOString(),
      scope: { type: "STORE", storeId: store.id, storeName: store.name },
      range: period.current,
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
      counts,
    };
  },
};
