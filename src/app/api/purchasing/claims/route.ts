import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { supplierClaimSchema } from "@/modules/purchase-orders/purchaseManagementContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseManagementService } from "@/modules/purchase-orders/services/purchaseManagementService";

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
    const requested = new URL(request.url).searchParams.get("storeId");
    const scope = requested || user.storeId ? await resolveAnalyticsStore(user, requested) : null;
    return NextResponse.json(await purchaseManagementService.listClaims(user.orgId, scope?.storeId));
  } catch (error) {
    return purchaseError(error, "Unable to list supplier claims");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePurchaseUser("manage");
    const input = supplierClaimSchema.parse(await request.json());
    return NextResponse.json(await purchaseManagementService.createClaim(user.orgId, user.id, input, user.storeId), { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid claim" }, { status: 400 });
    return purchaseError(error, "Unable to create supplier claim");
  }
}
