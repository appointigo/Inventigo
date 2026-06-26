import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

type GroupBy = "day" | "week" | "month";

type Aggregate = {
  period: string;
  sortKey: string;
  total_revenue: number;
  total_cost: number;
  total_discount: number;
  gross_profit: number;
};

type AggregateEntry = {
  createdAt: Date;
  totalRevenue: number;
  totalCost: number;
  totalDiscount: number;
};

async function hasTable(tableName: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_table: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = ${tableName}
      ) AS has_table
    `;

    return result[0]?.has_table ?? false;
  } catch {
    return false;
  }
}

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

async function hasEnumValue(enumName: string, enumValue: string) {
  try {
    const result = await prisma.$queryRaw<Array<{ has_value: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = ${enumName}
          AND e.enumlabel = ${enumValue}
      ) AS has_value
    `;

    return result[0]?.has_value ?? false;
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
    const group = (searchParams.get("group") ?? "month") as GroupBy;

    const paidAtFilter: Prisma.DateTimeFilter = {};
    if (from) {
      const fromDate = dayjs(from).startOf("day");
      if (fromDate.isValid()) {
        paidAtFilter.gte = fromDate.toDate();
      }
    }
    if (to) {
      const toDate = dayjs(to).endOf("day");
      if (toDate.isValid()) {
        paidAtFilter.lte = toDate.toDate();
      }
    }

    const [supportsExchangedStatus, hasReturnTransactionsTable, hasReturnItemsTable, hasReturnBusinessDate] = await Promise.all([
      hasEnumValue("SaleStatus", "EXCHANGED"),
      hasTable("return_transactions"),
      hasTable("return_transaction_items"),
      hasColumn("return_transactions", "businessDate"),
    ]);

    const saleStatuses = supportsExchangedStatus
      ? (["COMPLETED", "EXCHANGED", "REFUNDED"] as const)
      : (["COMPLETED", "REFUNDED"] as const);

    const saleWhere: any = {
      status: { in: saleStatuses as any },
      store: { orgId: user.orgId },
      ...(user.storeId ? { storeId: user.storeId } : {}),
    };

    if (Object.keys(paidAtFilter).length) {
      saleWhere.createdAt = paidAtFilter;
    }

    const saleSelect: any = {
      id: true,
      createdAt: true,
      total: true,
      discountAmount: true,
      items: {
        select: {
          quantity: true,
          product: { select: { costPrice: true } },
        },
      },
    };

    const sales = await prisma.sale.findMany({
      where: saleWhere,
      select: saleSelect,
      orderBy: { createdAt: "asc" },
    });

    let returnTransactions: any[] = [];
    if (hasReturnTransactionsTable) {
      const returnWhere: any = {
        store: { orgId: user.orgId },
        ...(user.storeId ? { storeId: user.storeId } : {}),
      };

      if (Object.keys(paidAtFilter).length) {
        if (hasReturnBusinessDate) {
          returnWhere.businessDate = paidAtFilter;
        } else {
          returnWhere.createdAt = paidAtFilter;
        }
      }

      const returnSelect: any = {
        id: true,
        type: true,
        createdAt: true,
        netAmount: true,
        offsetAmount: true,
      };
      if (hasReturnBusinessDate) {
        returnSelect.businessDate = true;
      }
      if (hasReturnItemsTable) {
        returnSelect.items = {
          select: {
            newProductId: true,
            newQuantity: true,
            newUnitPrice: true,
            newProduct: { select: { costPrice: true } },
            returnedProductId: true,
            returnedQuantity: true,
            returnedUnitPrice: true,
            returnedProduct: { select: { costPrice: true } },
          },
        };
      }

      returnTransactions = await prisma.returnTransaction.findMany({
        where: returnWhere,
        select: returnSelect,
        orderBy: hasReturnBusinessDate ? ({ businessDate: "asc" } as any) : ({ createdAt: "asc" } as any),
      });
    }

    const allEntries: AggregateEntry[] = [
      ...sales.map((sale: any) => ({
        createdAt: sale.createdAt,
        totalRevenue: Number(sale.total ?? 0),
        totalCost: sale.items.reduce(
          (sum: number, item: any) => sum + Number(item.product.costPrice ?? 0) * Number(item.quantity ?? 0),
          0
        ),
        totalDiscount: Number(sale.discountAmount ?? 0),
      })),
      ...returnTransactions.map((rt: any) => {
        const items = Array.isArray(rt.items) ? rt.items : [];
        const exchangedItems = items.filter((item: any) => item.newProductId);
        const returnedItems = items.filter((item: any) => item.returnedProductId);

        const exchangedRevenue = exchangedItems.reduce(
          (sum: number, item: any) => sum + Number(item.newUnitPrice ?? 0) * Number(item.newQuantity ?? 0),
          0
        );
        const exchangedCost = exchangedItems.reduce(
          (sum: number, item: any) => sum + Number(item.newProduct?.costPrice ?? 0) * Number(item.newQuantity ?? 0),
          0
        );

        const returnedRevenue = returnedItems.reduce(
          (sum: number, item: any) => sum + Number(item.returnedUnitPrice ?? 0) * Number(item.returnedQuantity ?? 0),
          0
        );
        const returnedCost = returnedItems.reduce(
          (sum: number, item: any) => sum + Number(item.returnedProduct?.costPrice ?? 0) * Number(item.returnedQuantity ?? 0),
          0
        );

        if (rt.type === "EXCHANGE") {
          if (items.length > 0) {
            return {
              createdAt: rt.businessDate ?? rt.createdAt,
              totalRevenue: exchangedRevenue,
              totalCost: exchangedCost,
              totalDiscount: 0,
            };
          }

          return {
            createdAt: rt.businessDate ?? rt.createdAt,
            totalRevenue: Number(rt.offsetAmount ?? 0) + Number(rt.netAmount ?? 0),
            totalCost: 0,
            totalDiscount: 0,
          };
        }

        if (rt.type === "RETURN") {
          if (items.length > 0) {
            return {
              createdAt: rt.businessDate ?? rt.createdAt,
              totalRevenue: -returnedRevenue,
              totalCost: -returnedCost,
              totalDiscount: 0,
            };
          }

          return {
            createdAt: rt.businessDate ?? rt.createdAt,
            totalRevenue: Number(rt.netAmount ?? 0),
            totalCost: 0,
            totalDiscount: 0,
          };
        }

        if (items.length > 0) {
          return {
            createdAt: rt.businessDate ?? rt.createdAt,
            totalRevenue: exchangedRevenue - returnedRevenue,
            totalCost: exchangedCost - returnedCost,
            totalDiscount: 0,
          };
        }

        return {
          createdAt: rt.businessDate ?? rt.createdAt,
          totalRevenue: Number(rt.netAmount ?? 0),
          totalCost: 0,
          totalDiscount: 0,
        };
      }),
    ];

    const grouped = new Map<string, Aggregate>();

    for (const entry of allEntries) {
      const createdAt = dayjs(entry.createdAt);
      const totalRevenue = entry.totalRevenue;
      const totalCost = entry.totalCost;
      const totalDiscount = entry.totalDiscount;
      const grossProfit = totalRevenue - totalCost - totalDiscount;

      let period = createdAt.format("MMM YY");
      let sortKey = createdAt.startOf("month").format("YYYY-MM-DD");

      if (group === "day") {
        period = createdAt.format("DD MMM");
        sortKey = createdAt.startOf("day").format("YYYY-MM-DD");
      } else if (group === "week") {
        const weekStart = createdAt.startOf("week");
        period = `Wk of ${weekStart.format("DD MMM")}`;
        sortKey = weekStart.format("YYYY-MM-DD");
      }

      const existing = grouped.get(sortKey);
      if (existing) {
        existing.total_revenue += totalRevenue;
        existing.total_cost += totalCost;
        existing.total_discount += totalDiscount;
        existing.gross_profit += grossProfit;
      } else {
        grouped.set(sortKey, {
          period,
          sortKey,
          total_revenue: totalRevenue,
          total_cost: totalCost,
          total_discount: totalDiscount,
          gross_profit: grossProfit,
        });
      }
    }

    const data = Array.from(grouped.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((row) => {
        const marginPct = row.total_revenue > 0
          ? (row.gross_profit / row.total_revenue) * 100
          : 0;

        return {
          period: row.period,
          total_revenue: Number(row.total_revenue.toFixed(2)),
          total_cost: Number(row.total_cost.toFixed(2)),
          total_discount: Number(row.total_discount.toFixed(2)),
          gross_profit: Number(row.gross_profit.toFixed(2)),
          margin_pct: Number(marginPct.toFixed(1)),
        };
      });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
