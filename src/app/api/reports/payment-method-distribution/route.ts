import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessReports } from "@/lib/rbac";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { aggregatePaymentEntries } from "@/modules/analytics/utils/paymentAggregation";
import {
  businessDateEndExclusive,
  businessDateStart,
  isBusinessDate,
} from "@/modules/analytics/utils/dateRange";

const METHODS = ["CASH", "UPI", "CARD"] as const;

type PaymentMethod = (typeof METHODS)[number];

type NormalizedPayment = {
  source: "SALE_PAYMENT" | "LEGACY_SALE";
  paymentId?: string;
  saleId: string;
  invoiceNumber: string;
  method: PaymentMethod;
  amount: number;
  businessDate: Date;
};

const isPaymentMethod = (value: string): value is PaymentMethod =>
  METHODS.includes(value as PaymentMethod);

async function getPaymentLedgerCutoverDate(): Promise<Date | null> {
  const rows = await prisma.$queryRaw<Array<{ finished_at: Date | null }>>(Prisma.sql`
    SELECT finished_at
    FROM _prisma_migrations
    WHERE migration_name = '20260505120000_add_returns_and_partial_payments'
      AND finished_at IS NOT NULL
    ORDER BY finished_at ASC
    LIMIT 1
  `);

  return rows[0]?.finished_at ?? null;
}

export const GET = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessReports(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const storeId = scope.storeId;

    if (!isBusinessDate(from) || !isBusinessDate(to) || from > to) {
      return NextResponse.json(
        { error: "A valid from/to accounting period is required" },
        { status: 400 }
      );
    }

    const rangeStart = businessDateStart(from);
    const rangeEndExclusive = businessDateEndExclusive(to);
    const storeFilter = {
      store: { orgId: user.orgId },
      storeId,
    };

    const [
      ledgerCutoverDate,
      modernPayments,
      salesWithoutLedger,
      receivableAggregate,
      refundSettlements,
    ] = await Promise.all([
      getPaymentLedgerCutoverDate(),
      prisma.salePayment.findMany({
        where: {
          method: { in: [...METHODS] },
          businessDate: { gte: rangeStart, lt: rangeEndExclusive },
          sale: storeFilter,
        },
        select: {
          id: true,
          saleId: true,
          method: true,
          amount: true,
          businessDate: true,
          sale: { select: { invoiceNumber: true } },
        },
      }),
      prisma.sale.findMany({
        where: {
          ...storeFilter,
          transactionDate: { gte: rangeStart, lt: rangeEndExclusive },
          payments: { none: {} },
        },
        select: {
          id: true,
          invoiceNumber: true,
          paymentMethod: true,
          paymentStatus: true,
          amountPaid: true,
          amountDue: true,
          finalPayableAmount: true,
          total: true,
          transactionDate: true,
          createdAt: true,
        },
      }),
      prisma.sale.aggregate({
        where: {
          ...storeFilter,
          transactionDate: { gte: rangeStart, lt: rangeEndExclusive },
          status: { not: "REFUNDED" },
          paymentStatus: "PARTIAL",
          amountDue: { gt: 0 },
        },
        _sum: { amountDue: true },
      }),
      prisma.refundSettlement.aggregate({
        where: {
          orgId: user.orgId,
          storeId,
          settledAt: { gte: rangeStart, lt: rangeEndExclusive },
        },
        _sum: { amount: true },
      }),
    ]);

    const normalizedPayments: NormalizedPayment[] = modernPayments.map((payment) => ({
      source: "SALE_PAYMENT",
      paymentId: payment.id,
      saleId: payment.saleId,
      invoiceNumber: payment.sale.invoiceNumber,
      method: payment.method,
      amount: Number(payment.amount),
      businessDate: payment.businessDate,
    }));

    for (const sale of salesWithoutLedger) {
      const method = String(sale.paymentMethod);
      const isLegacy = ledgerCutoverDate !== null && sale.createdAt < ledgerCutoverDate;
      const isConfirmedPaid = sale.paymentStatus === "PAID" && Number(sale.amountDue) === 0;

      if (!isLegacy) {
        console.warn(
          "[payment-method-distribution] Sale after ledger cutover has no SalePayment rows",
          {
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            transactionDate: sale.transactionDate,
            createdAt: sale.createdAt,
            paymentStatus: sale.paymentStatus,
            amountPaid: Number(sale.amountPaid),
            amountDue: Number(sale.amountDue),
          }
        );
        continue;
      }

      if (!isConfirmedPaid || !isPaymentMethod(method)) {
        console.warn("[payment-method-distribution] Legacy sale cannot be safely reconstructed", {
          saleId: sale.id,
          invoiceNumber: sale.invoiceNumber,
          paymentStatus: sale.paymentStatus,
          amountDue: Number(sale.amountDue),
          paymentMethod: method,
        });
        continue;
      }

      const amountPaid = Number(sale.amountPaid);
      const finalPayableAmount = Number(sale.finalPayableAmount ?? 0);
      const amount =
        amountPaid > 0
          ? amountPaid
          : finalPayableAmount > 0
            ? finalPayableAmount
            : Number(sale.total);

      if (amount <= 0) continue;

      normalizedPayments.push({
        source: "LEGACY_SALE",
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        method,
        amount,
        businessDate: sale.transactionDate,
      });
    }

    const distribution = aggregatePaymentEntries(normalizedPayments);
    const refundsPaid = Number(Number(refundSettlements._sum.amount ?? 0).toFixed(2));

    return NextResponse.json({
      methods: distribution.methods,
      totalReceived: distribution.totalReceived,
      refundsPaid,
      netCustomerMovement: Number((distribution.totalReceived - refundsPaid).toFixed(2)),
      amountReceivable: Number(Number(receivableAggregate._sum.amountDue ?? 0).toFixed(2)),
      scope,
    });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
