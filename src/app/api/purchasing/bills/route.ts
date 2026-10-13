import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { supplierBillSchema } from "@/modules/purchase-orders/purchaseManagementContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseManagementService } from "@/modules/purchase-orders/services/purchaseManagementService";

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
    const requested = new URL(request.url).searchParams.get("storeId");
    const scope = requested || user.storeId ? await resolveAnalyticsStore(user, requested) : null;
    return NextResponse.json(await purchaseManagementService.listBills(user.orgId, scope?.storeId));
  } catch (error) {
    return purchaseError(error, "Unable to list supplier bills");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePurchaseUser("manage");
    const input = supplierBillSchema.parse(await request.json());
    const scope = await resolveAnalyticsStore(user, input.storeId);
    const bill = await purchaseManagementService.createBill(user.orgId, user.id, input, scope.storeId);
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid bill" }, { status: 400 });
    return purchaseError(error, "Unable to create supplier bill");
  }
}
