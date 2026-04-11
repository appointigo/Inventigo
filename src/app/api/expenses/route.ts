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
    const storeId = user.storeId ?? searchParams.get("storeId") ?? undefined;
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const filters = {
      storeId,
      month: monthParam ? parseInt(monthParam, 10) : undefined,
      year: yearParam ? parseInt(yearParam, 10) : undefined,
    };

    const expenses = await expenseService.list(filters, user.orgId);
    return NextResponse.json(expenses);
  } catch (err) {
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

  try {
    const body = await request.json();
    if (!body.storeId || !body.category || body.amount == null || !body.date) {
      return NextResponse.json(
        { error: "storeId, category, amount, and date are required" },
        { status: 400 }
      );
    }
    const expense = await expenseService.create(body, user.id, user.orgId);
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("[expenses POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
