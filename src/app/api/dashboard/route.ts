import { NextResponse } from "next/server";
import { dashboardServiceCompat } from "@/modules/dashboard/services/dashboardServiceCompat";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

export const GET = async (request: Request) => {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { searchParams } = new URL(request.url);
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const startDate = startDateParam ? new Date(startDateParam) : null;
    const endDate = endDateParam ? new Date(endDateParam) : null;

    const validStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined;
    const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined;

    const data = await dashboardServiceCompat.getData(user.orgId, scope.storeId, validStartDate, validEndDate);
    return NextResponse.json({ ...data, scope });
  } 
  catch (err) {
    if (err instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dashboard GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
