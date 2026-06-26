import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOrgAuth } from "@/lib/auth.middleware";

type GroupBy = "day" | "week" | "month" | "year";

type Row = {
  period_start: Date;
  total_revenue: number;
  total_discount: number;
  net_profit: number;
  transaction_count: number;
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

    const [hasReturnTransactionsTable, hasReturnBusinessDate, hasReturnTransactionDate, hasReturnNetAmount, hasReturnOffsetAmount, hasReturnType] = await Promise.all([
      hasTable("return_transactions"),
      hasColumn("return_transactions", "businessDate"),
      hasColumn("return_transactions", "transactionDate"),
      hasColumn("return_transactions", "netAmount"),
      hasColumn("return_transactions", "offsetAmount"),
      hasColumn("return_transactions", "type"),
    ]);

    const salesDateExpr = Prisma.sql`s."createdAt"`;

    const returnDateExpr = hasReturnBusinessDate
      ? Prisma.sql`COALESCE(rt."businessDate", rt."createdAt")`
      : hasReturnTransactionDate
        ? Prisma.sql`COALESCE(rt."transactionDate", rt."createdAt")`
        : Prisma.sql`rt."createdAt"`;

    const returnNetExpr = hasReturnNetAmount
      ? Prisma.sql`COALESCE(rt."netAmount"::float8, 0)`
      : Prisma.sql`0::float8`;

    const returnOffsetExpr = hasReturnOffsetAmount
      ? Prisma.sql`COALESCE(rt."offsetAmount"::float8, 0)`
      : Prisma.sql`0::float8`;

    const returnTypeExpr = hasReturnType
      ? Prisma.sql`rt.type::text`
      : Prisma.sql`'RETURN'::text`;

    const returnBreakdownCte = hasReturnTransactionsTable
      ? Prisma.sql`
      , return_breakdown AS (
        SELECT
          rt.id,
          ${returnDateExpr} AS period_date,
          CASE
            WHEN ${returnTypeExpr} = 'EXCHANGE' THEN (${returnOffsetExpr} + ${returnNetExpr})
            ELSE ${returnNetExpr}
          END AS total_amount,
          0::float8 AS discount_amount,
          0::float8 AS total_cost,
          CASE WHEN ${returnNetExpr} > 0 THEN 1 ELSE 0 END AS transaction_count
        FROM return_transactions rt
        JOIN stores st ON st.id = rt."storeId"
        WHERE st."orgId" = ${user.orgId}
          AND (${user.storeId}::text IS NULL OR rt."storeId" = ${user.storeId})
          AND (${from}::text IS NULL OR ${returnDateExpr} >= (${from}::date))
          AND (${to}::text IS NULL OR ${returnDateExpr} < ((${to}::date + INTERVAL '1 day')))
      )`
      : Prisma.empty;

    const combinedCte = hasReturnTransactionsTable
      ? Prisma.sql`
      , combined AS (
        SELECT period_date, total_amount, discount_amount, total_cost, transaction_count FROM sale_breakdown
        UNION ALL
        SELECT period_date, total_amount, discount_amount, total_cost, transaction_count FROM return_breakdown
      )`
      : Prisma.sql`
      , combined AS (
        SELECT period_date, total_amount, discount_amount, total_cost, transaction_count FROM sale_breakdown
      )`;

    const rows = await prisma.$queryRaw<Row[]>`
      WITH sale_breakdown AS (
        SELECT
          s.id,
          ${salesDateExpr} AS period_date,
          COALESCE(s.total::float8, s."amountPaid"::float8, 0) AS total_amount,
          COALESCE(s."discountAmount"::float8, 0) AS discount_amount,
          COALESCE(SUM((p."costPrice"::float8) * si.quantity), 0)::float8 AS total_cost,
          1 AS transaction_count
        FROM sales s
        JOIN sale_items si ON si."saleId" = s.id
        JOIN products p ON p.id = si."productId"
        JOIN stores st ON st.id = s."storeId"
        WHERE st."orgId" = ${user.orgId}
          AND (${user.storeId}::text IS NULL OR s."storeId" = ${user.storeId})
          AND s."status"::text IN ('COMPLETED', 'EXCHANGED', 'REFUNDED')
          AND (${from}::text IS NULL OR ${salesDateExpr} >= (${from}::date))
          AND (${to}::text IS NULL OR ${salesDateExpr} < ((${to}::date + INTERVAL '1 day')))
        GROUP BY s.id, ${salesDateExpr}, s.total, s."discountAmount"
      )
      ${returnBreakdownCte}
      ${combinedCte}
      SELECT
        DATE_TRUNC(${dateTruncUnit}, period_date) AS period_start,
        COALESCE(SUM(total_amount), 0)::float8 AS total_revenue,
        COALESCE(SUM(discount_amount), 0)::float8 AS total_discount,
        COALESCE(SUM(total_amount - total_cost), 0)::float8 AS net_profit,
        COALESCE(SUM(transaction_count), 0)::float8 AS transaction_count
      FROM combined
      GROUP BY 1
      ORDER BY 1;
    `;

    const data = rows.map((row) => ({
      period: row.period_start,
      total_revenue: Number(row.total_revenue ?? 0),
      total_discount: Number(row.total_discount ?? 0),
      net_profit: Number(row.net_profit ?? 0),
      transaction_count: Number(row.transaction_count ?? 0),
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
