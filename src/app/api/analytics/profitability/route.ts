import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsAccessError,
  resolveAnalyticsStoreId,
} from "@/modules/analytics/services/analyticsAccess";
import { profitabilityAnalyticsService } from "@/modules/analytics/services/profitabilityAnalyticsService";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";

const ALLOWED_ROLES = new Set<Role>([Role.OWNER, Role.ADMIN, Role.MANAGER]);

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const storeId = await resolveAnalyticsStoreId(user, searchParams.get("storeId"));
    const { from, to, group } = parseAnalyticsQuery(searchParams);
    return NextResponse.json(
      await profitabilityAnalyticsService.getAnalytics(user.orgId, storeId, from, to, group),
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AnalyticsQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[analytics profitability GET]", error);
    return NextResponse.json({ error: "Unable to load profitability analytics" }, { status: 500 });
  }
}
