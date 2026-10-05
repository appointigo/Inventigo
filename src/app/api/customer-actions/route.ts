import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsPeriodError,
  parseInventoryAnalyticsSearchParams,
} from "@/modules/inventory-intelligence/utils/analyticsPeriod";
import { customerActionService } from "@/modules/customer-action/customerActionService";
import type { CustomerActionType } from "@/modules/customer-action/customerSegments";
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const p = new URL(request.url).searchParams;
    const { storeId, period } = parseInventoryAnalyticsSearchParams(p, user.storeId);
    return NextResponse.json(
      await customerActionService.getData(user.orgId, storeId, period, {
        page: Number(p.get("page") ?? 1),
        pageSize: Number(p.get("pageSize") ?? 20),
        queue: (p.get("queue") || undefined) as CustomerActionType | undefined,
      })
    );
  } catch (error) {
    if (error instanceof AnalyticsPeriodError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[customer-actions GET]", error);
    return NextResponse.json({ error: "Unable to load customer actions" }, { status: 500 });
  }
}
