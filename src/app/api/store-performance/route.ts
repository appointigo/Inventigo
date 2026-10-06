import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";
import { businessDateEndExclusive } from "@/modules/analytics/utils/dateRange";
import { storePerformanceService } from "@/modules/owner-intelligence/storePerformanceService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === Role.OWNER || user.role === Role.ADMIN) || user.storeId) return NextResponse.json({ error: "Organization-wide owner or admin access is required" }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams; const { from } = parseAnalyticsQuery(params);
    return NextResponse.json(await storePerformanceService.get(user.orgId, from, businessDateEndExclusive(params.get("to")!)));
  } catch (error) {
    if (error instanceof AnalyticsQueryError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[store-performance GET]", error);
    return NextResponse.json({ error: "Unable to load store performance" }, { status: 500 });
  }
}
