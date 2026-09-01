import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { expenseAnalyticsService } from "@/modules/dashboard/services/expenseAnalyticsService";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? user.storeId ?? null;
    const period = searchParams.get("period") ?? "monthly";
    const startDateParam = searchParams.get("startDate") ?? null;
    const endDateParam = searchParams.get("endDate") ?? null;

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const data = await expenseAnalyticsService.getAnalytics(user.orgId, storeId, {
      period,
      startDate,
      endDate,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard expense-analytics GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
