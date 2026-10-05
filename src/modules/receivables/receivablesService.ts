import { prisma } from "@/lib/db";
import { Prisma, SaleStatus } from "@prisma/client";
import type { AnalyticsPeriod } from "@/modules/inventory-intelligence/types";
import {
  ageSinceSale,
  canonicalOutstanding,
  receivableBucket,
  type AgingBucket,
} from "./receivableAging";
import type { CustomerReceivableRow, ReceivablesResponse } from "./types";
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const ELIGIBLE: SaleStatus[] = [SaleStatus.COMPLETED, SaleStatus.EXCHANGED, SaleStatus.REFUNDED];

export const receivablesService = {
  async getData(
    orgId: string,
    storeId: string,
    period: AnalyticsPeriod,
    query: { page?: number; pageSize?: number; bucket?: AgingBucket } = {}
  ): Promise<ReceivablesResponse> {
    const now = new Date();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const store = await prisma.store.findFirst({
      where: { id: storeId, orgId, isActive: true },
      select: { id: true, name: true },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");
    const where: Prisma.SaleWhereInput = {
      storeId,
      store: { orgId },
      status: { in: ELIGIBLE },
      amountDue: { gt: 0 },
    };
    const [allOutstanding, collections] = await Promise.all([
      prisma.sale.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          transactionDate: true,
          total: true,
          finalPayableAmount: true,
          amountPaid: true,
          amountDue: true,
          paymentStatus: true,
          customer: { select: { name: true, mobile: true } },
          payments: { select: { amount: true, paidAt: true }, orderBy: { paidAt: "desc" } },
        },
        orderBy: { transactionDate: "asc" },
      }),
      prisma.salePayment.findMany({
        where: {
          sale: { storeId, store: { orgId } },
          businessDate: { gte: new Date(period.current.start), lt: new Date(period.current.end) },
        },
        select: { amount: true, businessDate: true, sale: { select: { transactionDate: true } } },
      }),
    ]);
    const rows = allOutstanding.map((sale) => {
      const age = ageSinceSale(sale.transactionDate, now);
      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        customer: sale.customer?.name || sale.customerName || "Walk-in customer",
        customerPhone: sale.customer?.mobile || sale.customerPhone || null,
        saleDate: sale.transactionDate.toISOString(),
        originalAmount: Number(sale.finalPayableAmount ?? sale.total),
        paid: Number(sale.amountPaid),
        outstanding: canonicalOutstanding({
          amountDue: Number(sale.amountDue),
          finalPayableAmount:
            sale.finalPayableAmount == null ? null : Number(sale.finalPayableAmount),
          total: Number(sale.total),
          amountPaid: Number(sale.amountPaid),
        }),
        age,
        bucket: receivableBucket(age),
        lastPayment: sale.payments[0]?.paidAt.toISOString() ?? null,
        paymentStatus: sale.paymentStatus,
      };
    });
    const filtered = query.bucket ? rows.filter((r) => r.bucket === query.bucket) : rows;
    const bucketOrder: AgingBucket[] = [
      "0–7 days",
      "8–30 days",
      "31–60 days",
      "61–90 days",
      "90+ days",
    ];
    const buckets = bucketOrder.map((bucket) => {
      const matching = rows.filter((r) => r.bucket === bucket);
      return {
        bucket,
        amount: round(matching.reduce((s, r) => s + r.outstanding, 0)),
        count: matching.length,
      };
    });
    const customerMap = new Map<string, CustomerReceivableRow>();
    for (const row of rows) {
      const key = row.customerId ?? "walk-in";
      const current = customerMap.get(key) ?? {
        customerId: row.customerId,
        customer: row.customer,
        outstanding: 0,
        invoiceCount: 0,
        oldestAge: 0,
        lastPayment: null,
      };
      current.outstanding += row.outstanding;
      current.invoiceCount++;
      current.oldestAge = Math.max(current.oldestAge, row.age);
      if (row.lastPayment && (!current.lastPayment || row.lastPayment > current.lastPayment))
        current.lastPayment = row.lastPayment;
      customerMap.set(key, current);
    }
    const lagRows = collections
      .filter((p) => p.businessDate >= p.sale.transactionDate)
      .map((p) => (p.businessDate.getTime() - p.sale.transactionDate.getTime()) / 86_400_000);
    return {
      generatedAt: now.toISOString(),
      scope: { type: "STORE", storeId: store.id, storeName: store.name },
      outstandingAsOf: now.toISOString(),
      collectionRange: period.current,
      kpis: {
        totalOutstanding: round(rows.reduce((s, r) => s + r.outstanding, 0)),
        invoiceCount: rows.length,
        averageAge: rows.length ? round(rows.reduce((s, r) => s + r.age, 0) / rows.length, 1) : 0,
        oldestAge: rows.reduce((max, r) => Math.max(max, r.age), 0),
        collectedInPeriod: round(collections.reduce((s, p) => s + Number(p.amount), 0)),
        averageCollectionLag: lagRows.length
          ? round(lagRows.reduce((a, b) => a + b, 0) / lagRows.length, 1)
          : null,
      },
      buckets,
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      customers: [...customerMap.values()]
        .map((r) => ({ ...r, outstanding: round(r.outstanding) }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 50),
      total: filtered.length,
      page,
      pageSize,
    };
  },
};
