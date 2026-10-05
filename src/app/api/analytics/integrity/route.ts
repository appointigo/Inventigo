import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { dataIntegrityService } from "@/modules/analytics/services/dataIntegrityService";

const ALLOWED_ROLES = new Set<Role>([Role.OWNER, Role.ADMIN]);

export async function GET(request: Request) {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (!ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const scope = await resolveAnalyticsStore(user, new URL(request.url).searchParams.get("storeId"));
    const result = await dataIntegrityService.inspect(user.orgId, scope.storeId);
    return NextResponse.json({ ...result, scope });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[analytics integrity GET]", error);
    return NextResponse.json({ error: "Unable to run data integrity checks" }, { status: 500 });
  }
}
