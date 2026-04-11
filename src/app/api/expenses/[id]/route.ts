import { NextResponse } from "next/server";
import { expenseService } from "@/modules/expenses/services/expenseService";
import { requireOrgAuth } from "@/lib/auth.middleware";

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

  const { id } = await params;
  try {
    const body = await request.json();
    const expense = await expenseService.update(id, user.orgId, body);
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json(expense);
  } catch (err) {
    console.error("[expenses PUT]", err);
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

  const { id } = await params;
  try {
    const deleted = await expenseService.remove(id, user.orgId);
    if (!deleted) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[expenses DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
