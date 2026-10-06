import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";
import { businessDateEndExclusive } from "@/modules/analytics/utils/dateRange";
import { procurementIntelligenceService } from "@/modules/procurement-intelligence/procurementIntelligenceService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (![Role.OWNER, Role.ADMIN, Role.MANAGER].some((role) => role === user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const params = new URL(request.url).searchParams; const scope = await resolveAnalyticsStore(user, params.get("storeId")); const { from } = parseAnalyticsQuery(params); return NextResponse.json(await procurementIntelligenceService.get(user.orgId, scope.storeId, from, businessDateEndExclusive(params.get("to")!))); }
  catch (error) { if (error instanceof AnalyticsAccessError) return NextResponse.json({ error: error.message }, { status: error.status }); if (error instanceof AnalyticsQueryError) return NextResponse.json({ error: error.message }, { status: 400 }); console.error("[procurement-intelligence GET]", error); return NextResponse.json({ error: "Unable to load procurement intelligence" }, { status: 500 }); }
}
