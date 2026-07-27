import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

type GroupBy = "day" | "week" | "month";

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

    const group: GroupBy = groupParam === "day" || groupParam === "week" ? groupParam : "month";
    const dateTruncUnit = group === "day" ? "day" : group === "week" ? "week" : "month";

    const rows = await prisma.$queryRaw<Row[]>`
      WITH sale_cost AS (
        SELECT
          s.id,
          s."createdAt",
          s.total::float8 AS total_amount,
          s."discountAmount"::float8 AS discount_amount,
          COALESCE(SUM((p."costPrice"::float8) * si.quantity), 0)::float8 AS total_cost
        FROM sales s
        JOIN sale_items si ON si."saleId" = s.id
        JOIN products p ON p.id = si."productId"
        JOIN stores st ON st.id = s."storeId"
        WHERE st."orgId" = ${user.orgId}
          AND (${user.storeId}::text IS NULL OR s."storeId" = ${user.storeId})
          AND (${from}::text IS NULL OR s."createdAt" >= (${from}::date))
          AND (${to}::text IS NULL OR s."createdAt" < ((${to}::date + INTERVAL '1 day')))
        GROUP BY s.id, s."createdAt", s.total, s."discountAmount"
      )
      SELECT
        DATE_TRUNC(${dateTruncUnit}, "createdAt") AS period_start,
        COALESCE(SUM(total_amount), 0)::float8 AS total_revenue,
        COALESCE(SUM(discount_amount), 0)::float8 AS total_discount,
        COALESCE(SUM(total_amount - total_cost), 0)::float8 AS net_profit
      FROM sale_cost
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
