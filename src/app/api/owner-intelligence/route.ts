import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";
import { businessDateEndExclusive } from "@/modules/analytics/utils/dateRange";
import { ownerIntelligenceService } from "@/modules/owner-intelligence/ownerIntelligenceService";
import type { ContributionDimension } from "@/modules/owner-intelligence/ownerAnalytics";

const roles = new Set<Role>([Role.OWNER, Role.ADMIN, Role.MANAGER]);
const dimensions = new Set<ContributionDimension>(["product", "category", "brand", "customer"]);

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roles.has(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, params.get("storeId"));
    const { from } = parseAnalyticsQuery(params);
    const toValue = params.get("to")!;
    const rawDimension = params.get("dimension") ?? "product";
    if (!dimensions.has(rawDimension as ContributionDimension)) return NextResponse.json({ error: "Invalid contribution dimension" }, { status: 400 });
    const data = await ownerIntelligenceService.getStoreAnalysis(user.orgId, scope.storeId, from, businessDateEndExclusive(toValue), rawDimension as ContributionDimension);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AnalyticsAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AnalyticsQueryError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[owner-intelligence GET]", error);
    return NextResponse.json({ error: "Unable to load owner intelligence" }, { status: 500 });
  }
}
