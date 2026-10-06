import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";
import { businessDateEndExclusive } from "@/modules/analytics/utils/dateRange";
import { transferRecommendationService } from "@/modules/stock-transfers/transferRecommendationService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !(user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER) ||
    user.storeId
  )
    return NextResponse.json(
      { error: "Cross-store intelligence requires organization-wide access" },
      { status: 403 }
    );
  try {
    const params = new URL(request.url).searchParams;
    const { from } = parseAnalyticsQuery(params);
    return NextResponse.json(
      await transferRecommendationService.get(
        user.orgId,
        from,
        businessDateEndExclusive(params.get("to")!)
      )
    );
  } catch (error) {
    if (error instanceof AnalyticsQueryError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[transfer recommendations]", error);
    return NextResponse.json({ error: "Unable to load transfer recommendations" }, { status: 500 });
  }
}
