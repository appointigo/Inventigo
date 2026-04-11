import { NextResponse } from "next/server";
import { expenseCategoryService } from "@/modules/expenses/services/expenseCategoryService";
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

  if (!["OWNER", "ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const deleted = await expenseCategoryService.remove(id, user.orgId);
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[expenses/categories DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
