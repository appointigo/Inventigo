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

    const [sales, returnTransactions] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
          store: { orgId: user.orgId },
          ...(user.storeId ? { storeId: user.storeId } : {}),
          ...(Object.keys(paidAtFilter).length ? { transactionDate: paidAtFilter } : {}),
        },
        select: {
          id: true,
          transactionDate: true,
          total: true,
          discountAmount: true,
          items: {
            select: {
              quantity: true,
              product: { select: { costPrice: true } },
            },
          },
        },
        orderBy: { transactionDate: "asc" },
      }),
      prisma.returnTransaction.findMany({
        where: {
          store: { orgId: user.orgId },
          ...(user.storeId ? { storeId: user.storeId } : {}),
          ...(Object.keys(paidAtFilter).length ? { businessDate: paidAtFilter } : {}),
        },
        select: {
          id: true,
          type: true,
          businessDate: true,
          createdAt: true,
          netAmount: true,
          offsetAmount: true,
          items: {
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
          },
        },
        orderBy: { businessDate: "asc" },
      }),
    ]);

    const allEntries: AggregateEntry[] = [
      ...sales.map((sale) => ({
        createdAt: sale.transactionDate,
        totalRevenue: Number(sale.total ?? 0),
        totalCost: sale.items.reduce(
          (sum, item) => sum + Number(item.product.costPrice ?? 0) * Number(item.quantity ?? 0),
          0
        ),
        totalDiscount: Number(sale.discountAmount ?? 0),
      })),
      ...returnTransactions.map((rt) => {
        const exchangedItems = rt.items.filter((item) => item.newProductId);
        const returnedItems = rt.items.filter((item) => item.returnedProductId);

        const exchangedRevenue = exchangedItems.reduce(
          (sum, item) => sum + Number(item.newUnitPrice ?? 0) * Number(item.newQuantity ?? 0),
          0
        );
        const exchangedCost = exchangedItems.reduce(
          (sum, item) => sum + Number(item.newProduct?.costPrice ?? 0) * Number(item.newQuantity ?? 0),
          0
        );

        const returnedRevenue = returnedItems.reduce(
          (sum, item) => sum + Number(item.returnedUnitPrice ?? 0) * Number(item.returnedQuantity ?? 0),
          0
        );
        const returnedCost = returnedItems.reduce(
          (sum, item) => sum + Number(item.returnedProduct?.costPrice ?? 0) * Number(item.returnedQuantity ?? 0),
          0
        );

        if (rt.type === "EXCHANGE") {
          return {
            createdAt: rt.businessDate ?? rt.createdAt,
            totalRevenue: exchangedRevenue,
            totalCost: exchangedCost,
            totalDiscount: 0,
          };
        }

        if (rt.type === "RETURN") {
          return {
            createdAt: rt.businessDate ?? rt.createdAt,
            totalRevenue: -returnedRevenue,
            totalCost: -returnedCost,
            totalDiscount: 0,
          };
        }

        return {
          createdAt: rt.businessDate ?? rt.createdAt,
          totalRevenue: exchangedRevenue - returnedRevenue,
          totalCost: exchangedCost - returnedCost,
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
