import { NextResponse } from "next/server";
import { expenseBudgetService } from "@/modules/expenses/services/expenseBudgetService";
import { requireOrgAuth } from "@/lib/auth.middleware";

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
    const deleted = await expenseBudgetService.remove(id, user.orgId);
    if (!deleted) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[budgets DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
