import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

const METHODS = ["CASH", "UPI", "CARD"] as const;

const METHOD_LABELS: Record<(typeof METHODS)[number], string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};

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

  try {
    const { searchParams } = new URL(request.url);
    const from = dayjs(searchParams.get("from"));
    const to = dayjs(searchParams.get("to"));
    const storeId = searchParams.get("storeId") ?? user.storeId ?? undefined;

    if (!from.isValid() || !to.isValid() || from.isAfter(to, "day")) {
      return NextResponse.json(
        { error: "A valid from/to accounting period is required" },
        { status: 400 },
      );
    }

    const rangeStart = from.startOf("day").toDate();
    const rangeEnd = to.endOf("day").toDate();
    const storeFilter = {
      store: { orgId: user.orgId },
      ...(storeId ? { storeId } : {}),
    };

    const [ledgerCutoverDate, modernPayments, salesWithoutLedger, receivableAggregate] = await Promise.all([
      getPaymentLedgerCutoverDate(),
      prisma.salePayment.findMany({
        where: {
          method: { in: [...METHODS] },
          businessDate: { gte: rangeStart, lte: rangeEnd },
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
          transactionDate: { gte: rangeStart, lte: rangeEnd },
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
          transactionDate: { gte: rangeStart, lte: rangeEnd },
          status: { not: "REFUNDED" },
          paymentStatus: "PARTIAL",
          amountDue: { gt: 0 },
        },
        _sum: { amountDue: true },
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
        console.warn("[payment-method-distribution] Sale after ledger cutover has no SalePayment rows", {
          saleId: sale.id,
          invoiceNumber: sale.invoiceNumber,
          transactionDate: sale.transactionDate,
          createdAt: sale.createdAt,
          paymentStatus: sale.paymentStatus,
          amountPaid: Number(sale.amountPaid),
          amountDue: Number(sale.amountDue),
        });
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
      const amount = amountPaid > 0
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

    const totals = new Map<PaymentMethod, { value: number; count: number }>(
      METHODS.map((method) => [method, { value: 0, count: 0 }]),
    );
    for (const payment of normalizedPayments) {
      const entry = totals.get(payment.method)!;
      entry.value += payment.amount;
      entry.count += 1;
    }

    const totalReceived = METHODS.reduce(
      (sum, method) => sum + totals.get(method)!.value,
      0,
    );

    const methods = totalReceived === 0
      ? []
      : METHODS.map((method) => {
        const entry = totals.get(method)!;
        return {
          name: METHOD_LABELS[method],
          value: Number(entry.value.toFixed(2)),
          count: entry.count,
          percentage: Number(((entry.value / totalReceived) * 100).toFixed(2)),
        };
      });

    return NextResponse.json({
      methods,
      totalReceived: Number(totalReceived.toFixed(2)),
      amountReceivable: Number(Number(receivableAggregate._sum.amountDue ?? 0).toFixed(2)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
