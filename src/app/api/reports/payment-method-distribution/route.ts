import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  SPLIT: "Split",
};

type PaymentGroupRow = {
  method: string;
  _sum: { amount: number | null };
  _count: { _all: number };
};

async function hasColumn(tableName: string, columnName: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_column: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) AS has_column
    `;

    return result[0]?.has_column ?? false;
  } catch {
    return false;
  }
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const hasSalesTransactionDate = await hasColumn("sales", "transactionDate");

    const businessDateFilter: Record<string, Date> = {};
    if (from) {
      const fromDate = dayjs(from).startOf("day");
      if (fromDate.isValid()) {
        businessDateFilter.gte = fromDate.toDate();
      }
    }
    if (to) {
      const toDate = dayjs(to).endOf("day");
      if (toDate.isValid()) {
        businessDateFilter.lte = toDate.toDate();
      }
    }

    const paymentGroups = (await prisma.salePayment.groupBy({
      by: ["method"],
      where: {
        sale: {
          store: { orgId: user.orgId },
          ...(user.storeId ? { storeId: user.storeId } : {}),
        },
        ...(Object.keys(businessDateFilter).length > 0 ? { businessDate: businessDateFilter } : {}),
      },
      _sum: { amount: true },
      _count: { _all: true },
    })) as unknown as PaymentGroupRow[];

    // Backward-compatible fallback for legacy sales that never recorded sale_payment rows.
    const legacySales = await prisma.sale.findMany({
      where: {
        store: { orgId: user.orgId },
        ...(user.storeId ? { storeId: user.storeId } : {}),
        payments: { none: {} },
        amountPaid: { gt: 0 },
        status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
        ...(Object.keys(businessDateFilter).length > 0
          ? {
              [hasSalesTransactionDate ? "transactionDate" : "createdAt"]: businessDateFilter,
            }
          : {}),
      },
      select: {
        amountPaid: true,
        paymentMethod: true,
      },
    });

    const methodTotals = new Map<string, { amount: number; count: number }>();

    for (const row of paymentGroups) {
      const key = String(row.method ?? "").toUpperCase();
      const current = methodTotals.get(key) ?? { amount: 0, count: 0 };
      current.amount += Number(row._sum.amount ?? 0);
      current.count += Number(row._count._all ?? 0);
      methodTotals.set(key, current);
    }

    for (const sale of legacySales) {
      const key = String(sale.paymentMethod ?? "CASH").toUpperCase();
      const current = methodTotals.get(key) ?? { amount: 0, count: 0 };
      current.amount += Number(sale.amountPaid ?? 0);
      current.count += 1;
      methodTotals.set(key, current);
    }

    const totalAmount = Array.from(methodTotals.values()).reduce((sum, entry) => sum + entry.amount, 0);

    const result = Array.from(methodTotals.entries())
      .map(([method, entry]) => ({
        name: METHOD_LABELS[method] ?? method,
        value: Number(entry.amount.toFixed(2)),
        count: entry.count,
        percentage: totalAmount > 0 ? Number(((entry.amount / totalAmount) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
