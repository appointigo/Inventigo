import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerIntelligenceService } from "@/modules/customers/services/customerIntelligenceService";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const requestedStore = new URL(request.url).searchParams.get("storeId");
    const scope = requestedStore || user.storeId
      ? await resolveAnalyticsStore(user, requestedStore)
      : null;
    const data = await customerIntelligenceService.insights(user.orgId, scope?.storeId);
    return NextResponse.json({
      ...data,
      scope: scope ?? { type: "ORGANIZATION", organizationId: user.orgId },
    });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load customer insights" }, { status: 500 });
  }
}
