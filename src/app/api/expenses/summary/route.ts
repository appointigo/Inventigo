import { NextResponse } from "next/server";
import { expenseService } from "@/modules/expenses/services/expenseService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? user.storeId;
    const yearParam = searchParams.get("year");

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const summary = await expenseService.summary(storeId, user.orgId, year);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[expenses/summary GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
