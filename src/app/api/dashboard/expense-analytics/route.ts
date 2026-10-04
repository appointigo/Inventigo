import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { expenseAnalyticsService } from "@/modules/dashboard/services/expenseAnalyticsService";
import {
  AnalyticsAccessError,
  resolveAnalyticsStoreId,
} from "@/modules/analytics/services/analyticsAccess";
import { businessDateStart, isBusinessDate } from "@/modules/analytics/utils/dateRange";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeId = await resolveAnalyticsStoreId(user, searchParams.get("storeId"));
    const period = searchParams.get("period") ?? "monthly";
    const startDateParam = searchParams.get("startDate") ?? null;
    const endDateParam = searchParams.get("endDate") ?? null;

    if ((startDateParam && !isBusinessDate(startDateParam)) || (endDateParam && !isBusinessDate(endDateParam))) {
      return NextResponse.json({ error: "Invalid expense analytics date range" }, { status: 400 });
    }
    const startDate = startDateParam ? businessDateStart(startDateParam) : undefined;
    const endDate = endDateParam ? businessDateStart(endDateParam) : undefined;
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ error: "Invalid expense analytics date range" }, { status: 400 });
    }

    const data = await expenseAnalyticsService.getAnalytics(user.orgId, storeId, {
      period,
      startDate,
      endDate,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[dashboard expense-analytics GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
