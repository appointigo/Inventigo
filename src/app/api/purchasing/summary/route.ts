import { NextResponse } from "next/server";
import { resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseManagementService } from "@/modules/purchase-orders/services/purchaseManagementService";

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
    const requested = new URL(request.url).searchParams.get("storeId");
    const scope = requested || user.storeId ? await resolveAnalyticsStore(user, requested) : null;
    return NextResponse.json(await purchaseManagementService.summary(user.orgId, scope?.storeId));
  } catch (error) {
    return purchaseError(error, "Unable to load purchasing summary");
  }
}
