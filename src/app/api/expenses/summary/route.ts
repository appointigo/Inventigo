import { NextResponse } from "next/server";
import { expenseService } from "@/modules/expenses/services/expenseService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { canAccessExpenses } from "@/lib/rbac";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessExpenses(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const yearParam = searchParams.get("year");

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const summary = await expenseService.summary(scope.storeId, user.orgId, year);
    return NextResponse.json({ ...summary, scope });
  } catch (err) {
    if (err instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[expenses/summary GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
