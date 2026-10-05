import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { productIntelligenceService } from "@/modules/product-intelligence/productIntelligenceService";
import {
  AnalyticsPeriodError,
  parseInventoryAnalyticsSearchParams,
} from "@/modules/inventory-intelligence/utils/analyticsPeriod";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const { storeId, period } = parseInventoryAnalyticsSearchParams(params, user.storeId);
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("pageSize") ?? 25);
    const data = await productIntelligenceService.getData(user.orgId, storeId, period, {
      page,
      pageSize,
      categoryId: params.get("categoryId") || undefined,
      brandId: params.get("brandId") || undefined,
      productStatus: (params.get("productStatus") || undefined) as
        | "active"
        | "inactive"
        | undefined,
      status: params.get("status") || undefined,
      sort: params.get("sort") || undefined,
      direction: params.get("direction") === "asc" ? "asc" : "desc",
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AnalyticsPeriodError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[product-intelligence GET]", error);
    return NextResponse.json({ error: "Unable to load product intelligence" }, { status: 500 });
  }
}
