import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessReports } from "@/lib/rbac";
import {
  AnalyticsAccessError,
  resolveAnalyticsStoreId,
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
  if (!canAccessReports(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const storeId = await resolveAnalyticsStoreId(user, searchParams.get("storeId"));
    const { from, to, group } = parseAnalyticsQuery(searchParams);
    const analytics = await salesAnalyticsService.getAnalytics(user.orgId, storeId, from, to, group);
    return NextResponse.json(
      analytics.trend.map((row) => ({
        period: row.label,
        sortKey: row.period,
        total_revenue: row.revenue,
        total_cost: row.cogs,
        total_discount: row.discount,
        gross_profit: row.grossProfit,
        margin_pct:
          row.grossProfit !== null && row.revenue !== 0
            ? Number(((row.grossProfit / row.revenue) * 100).toFixed(1))
            : null,
      })),
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AnalyticsQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[profit-margin GET]", error);
    return NextResponse.json({ error: "Unable to load profit margin" }, { status: 500 });
  }
}
