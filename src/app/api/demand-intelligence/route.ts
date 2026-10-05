import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  DemandAccessError,
  DemandValidationError,
  demandIntelligenceService,
} from "@/modules/demand-intelligence/services/demandIntelligenceService";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const params = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, params.get("storeId")?.trim() || null);
    const end = params.get("end") ? new Date(params.get("end")!) : new Date();
    const start = params.get("start")
      ? new Date(params.get("start")!)
      : new Date(end.getTime() - 30 * 86_400_000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    const data = await demandIntelligenceService.analytics(
      user.orgId, user.storeId, scope.storeId, start, end,
    );
    return NextResponse.json({ ...data, scope });
  } catch (error) {
    if (error instanceof AnalyticsAccessError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof DemandAccessError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof DemandValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[demand-intelligence GET]", error);
    return NextResponse.json({ error: "Unable to load demand intelligence" }, { status: 500 });
  }
}
