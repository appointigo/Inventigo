import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { salesAnalyticsService } from "@/modules/analytics/services/salesAnalyticsService";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const { from, to, group } = parseAnalyticsQuery(searchParams);
    const data = await salesAnalyticsService.getAnalytics(user.orgId, scope.storeId, from, to, group);
    return NextResponse.json({ ...data, scope });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AnalyticsQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[analytics sales GET]", error);
    return NextResponse.json({ error: "Unable to load sales analytics" }, { status: 500 });
  }
}
