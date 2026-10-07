import { NextResponse } from "next/server";
import {
  expenseService,
  InvalidExpenseAmountError,
  SettledExpenseConflictError,
} from "@/modules/expenses/services/expenseService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessExpenses } from "@/lib/rbac";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const expense = await expenseService.getById(id, user.orgId);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const body = await request.json();
    const expense = await expenseService.update(id, user.orgId, body);
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json(expense);
  } catch (err) {
    console.error("[expenses PUT]", err);
    if (err instanceof InvalidExpenseAmountError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof SettledExpenseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const deleted = await expenseService.remove(id, user.orgId);
    if (!deleted) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[expenses DELETE]", err);
    if (err instanceof SettledExpenseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
