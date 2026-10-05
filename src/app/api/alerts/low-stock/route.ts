import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

export const GET = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const scope = await resolveAnalyticsStore(user, new URL(request.url).searchParams.get("storeId"));
    const lowStockItems = await alertService.checkStockLevels(user.orgId, scope.storeId);
    return NextResponse.json(lowStockItems);
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load stock alerts" }, { status: 500 });
  }
}
