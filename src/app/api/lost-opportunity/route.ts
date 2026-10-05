import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { lostOpportunityService } from "@/modules/lost-opportunity/lostOpportunityService";
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const p = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, p.get("storeId"));
    const end = p.get("end") ? new Date(p.get("end")!) : new Date();
    const start = p.get("start")
      ? new Date(p.get("start")!)
      : new Date(end.getTime() - 30 * 86_400_000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end)
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    return NextResponse.json(
      await lostOpportunityService.getData(user.orgId, user.storeId, scope.storeId, start, end)
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[lost-opportunity GET]", error);
    return NextResponse.json(
      { error: "Unable to load lost opportunity intelligence" },
      { status: 500 }
    );
  }
}
