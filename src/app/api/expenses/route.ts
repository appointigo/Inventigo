import { NextResponse } from "next/server";
import {
  expenseService,
  InvalidExpenseAmountError,
} from "@/modules/expenses/services/expenseService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { canAccessExpenses } from "@/lib/rbac";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const filters = {
      storeId: scope.storeId,
      month: monthParam ? parseInt(monthParam, 10) : undefined,
      year: yearParam ? parseInt(yearParam, 10) : undefined,
    };

    const expenses = await expenseService.list(filters, user.orgId);
    return NextResponse.json(expenses);
  } catch (err) {
    if (err instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[expenses GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const scope = await resolveAnalyticsStore(user, body.storeId ?? null);
    if (!body.storeId || !body.category || body.amount == null || !body.date) {
      return NextResponse.json(
        { error: "storeId, category, amount, and date are required" },
        { status: 400 }
      );
    }
    const expense = await expenseService.create({ ...body, storeId: scope.storeId }, user.id, user.orgId);
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    if (err instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof InvalidExpenseAmountError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[expenses POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
