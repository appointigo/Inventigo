import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsPeriodError,
  parseInventoryAnalyticsSearchParams,
} from "@/modules/inventory-intelligence/utils/analyticsPeriod";
import { receivablesService } from "@/modules/receivables/receivablesService";
import type { AgingBucket } from "@/modules/receivables/receivableAging";
const allowed = [Role.OWNER, Role.ADMIN, Role.MANAGER];
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowed.includes(user.role as (typeof allowed)[number]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const { storeId, period } = parseInventoryAnalyticsSearchParams(params, user.storeId);
    return NextResponse.json(
      await receivablesService.getData(user.orgId, storeId, period, {
        page: Number(params.get("page") ?? 1),
        pageSize: Number(params.get("pageSize") ?? 25),
        bucket: (params.get("bucket") || undefined) as AgingBucket | undefined,
      })
    );
  } catch (error) {
    if (error instanceof AnalyticsPeriodError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[receivables GET]", error);
    return NextResponse.json({ error: "Unable to load receivables" }, { status: 500 });
  }
}
