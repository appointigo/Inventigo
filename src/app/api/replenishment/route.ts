import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { AnalyticsQueryError, parseAnalyticsQuery } from "@/modules/analytics/utils/analyticsQuery";
import { businessDateEndExclusive } from "@/modules/analytics/utils/dateRange";
import { replenishmentService } from "@/modules/replenishment/replenishmentService";
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !(
      user.role === Role.OWNER ||
      user.role === Role.ADMIN ||
      user.role === Role.MANAGER ||
      user.role === Role.STAFF
    )
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, params.get("storeId"));
    const { from } = parseAnalyticsQuery(params);
    return NextResponse.json(
      await replenishmentService.get(
        user.orgId,
        scope.storeId,
        from,
        businessDateEndExclusive(params.get("to")!),
        {
          page: Number(params.get("page") ?? 1),
          pageSize: Number(params.get("pageSize") ?? 50),
          categoryId: params.get("categoryId") || undefined,
          brandId: params.get("brandId") || undefined,
          supplierId: params.get("supplierId") || undefined,
          action: params.get("action") || undefined,
        }
      )
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof AnalyticsQueryError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[replenishment GET]", error);
    return NextResponse.json(
      { error: "Unable to load replenishment intelligence" },
      { status: 500 }
    );
  }
}
