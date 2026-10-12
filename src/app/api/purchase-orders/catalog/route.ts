import { NextResponse } from "next/server";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseCatalogService } from "@/modules/purchase-orders/services/purchaseCatalogService";

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
    const { searchParams } = new URL(request.url);
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const result = await purchaseCatalogService.search(user.orgId, scope.storeId, {
      search: searchParams.get("search") || undefined,
      page: positiveInteger(searchParams.get("page"), 1),
      pageSize: positiveInteger(searchParams.get("pageSize"), 20),
    });
    return NextResponse.json({ ...result, storeId: scope.storeId });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return purchaseError(error, "Unable to search the purchase catalog");
  }
}
