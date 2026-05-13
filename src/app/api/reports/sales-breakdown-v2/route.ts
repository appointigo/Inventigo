import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

type GroupBy = "day" | "week" | "month" | "year";

type Row = {
  period_start: Date;
  total_revenue: number;
  total_discount: number;
  net_profit: number;
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
    const groupParam = (searchParams.get("group") ?? "month") as GroupBy;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const group: GroupBy = groupParam === "day" || groupParam === "week" || groupParam === "year" ? groupParam : "month";
    const dateTruncUnit = group === "day" ? "day" : group === "week" ? "week" : group === "year" ? "year" : "month";

    const rows = await prisma.$queryRaw<Row[]>`
      WITH sale_breakdown AS (
        SELECT
          s.id,
          s."transactionDate" AS period_date,
          COALESCE(s.total::float8, s."amountPaid"::float8, 0) AS total_amount,
          COALESCE(s."discountAmount"::float8, 0) AS discount_amount,
          COALESCE(SUM((p."costPrice"::float8) * si.quantity), 0)::float8 AS total_cost
        FROM sales s
        JOIN sale_items si ON si."saleId" = s.id
        JOIN products p ON p.id = si."productId"
        JOIN stores st ON st.id = s."storeId"
        WHERE st."orgId" = ${user.orgId}
          AND (${user.storeId}::text IS NULL OR s."storeId" = ${user.storeId})
          AND s."status" IN ('COMPLETED', 'EXCHANGED', 'REFUNDED')
          AND (${from}::text IS NULL OR s."transactionDate" >= (${from}::date))
          AND (${to}::text IS NULL OR s."transactionDate" < ((${to}::date + INTERVAL '1 day')))
        GROUP BY s.id, s."transactionDate", s.total, s."discountAmount"
      ),
      return_breakdown AS (
        -- For return transactions, treat them as revenue adjustments on the exchange/return date
        -- netAmount: additional charge for exchanges or refund reduction
        -- offsetAmount: value of returned product (for exchanges, this represents the credit issued)
        SELECT
          rt.id,
          COALESCE(rt."businessDate", rt."createdAt") AS period_date,
          -- For exchanges: include the full value of the new product (offsetAmount + netAmount)
          -- For returns: only the netAmount (which is typically negative for refunds)
          CASE 
            WHEN rt.type = 'EXCHANGE' THEN (COALESCE(rt."offsetAmount"::float8, 0) + COALESCE(rt."netAmount"::float8, 0))
            ELSE COALESCE(rt."netAmount"::float8, 0)
          END AS total_amount,
          0 AS discount_amount,
          0 AS total_cost
        FROM return_transactions rt
        JOIN stores st ON st.id = rt."storeId"
        WHERE st."orgId" = ${user.orgId}
          AND (${user.storeId}::text IS NULL OR rt."storeId" = ${user.storeId})
          AND (${from}::text IS NULL OR COALESCE(rt."businessDate", rt."createdAt") >= (${from}::date))
          AND (${to}::text IS NULL OR COALESCE(rt."businessDate", rt."createdAt") < ((${to}::date + INTERVAL '1 day')))
      ),
      combined AS (
        SELECT period_date, total_amount, discount_amount, total_cost FROM sale_breakdown
        UNION ALL
        SELECT period_date, total_amount, discount_amount, total_cost FROM return_breakdown
      )
      SELECT
        DATE_TRUNC(${dateTruncUnit}, period_date) AS period_start,
        COALESCE(SUM(total_amount), 0)::float8 AS total_revenue,
        COALESCE(SUM(discount_amount), 0)::float8 AS total_discount,
        COALESCE(SUM(total_amount - total_cost), 0)::float8 AS net_profit
      FROM combined
      GROUP BY 1
      ORDER BY 1;
    `;

    const data = rows.map((row) => ({
      period: row.period_start,
      total_revenue: Number(row.total_revenue ?? 0),
      total_discount: Number(row.total_discount ?? 0),
      net_profit: Number(row.net_profit ?? 0),
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
