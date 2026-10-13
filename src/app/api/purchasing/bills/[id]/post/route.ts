import { NextResponse } from "next/server";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseManagementService } from "@/modules/purchase-orders/services/purchaseManagementService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const approveDifference = body.approveDifference === true;
    const user = await requirePurchaseUser(approveDifference ? "approve" : "manage");
    const { id } = await params;
    return NextResponse.json(await purchaseManagementService.postBill(user.orgId, user.id, id, user.storeId, approveDifference));
  } catch (error) {
    return purchaseError(error, "Unable to post supplier bill");
  }
}
