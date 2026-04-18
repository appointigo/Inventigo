import { NextResponse } from "next/server";
import { expenseBudgetService } from "@/modules/expenses/services/expenseBudgetService";
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
    const storeId = user.storeId ?? searchParams.get("storeId") ?? undefined;
    const month = parseInt(searchParams.get("month") ?? "0", 10);
    const year = parseInt(searchParams.get("year") ?? "0", 10);

    if (!storeId || !month || !year) {
      return NextResponse.json({ error: "storeId, month, and year are required" }, { status: 400 });
    }

    const budgets = await expenseBudgetService.list(storeId, user.orgId, month, year);
    return NextResponse.json(budgets);
  } catch (err) {
    console.error("[budgets GET]", err);
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

  try {
    const body = await request.json();
    const { storeId, category, month, year, amount } = body;
    if (!storeId || !category || !month || !year || amount == null) {
      return NextResponse.json(
        { error: "storeId, category, month, year, and amount are required" },
        { status: 400 }
      );
    }

    const budget = await expenseBudgetService.upsert(
      storeId,
      user.orgId,
      category,
      Number(month),
      Number(year),
      Number(amount)
    );
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    console.error("[budgets POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
