import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const po = await poService.submitPO(id, user.orgId, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    return purchaseError(err, "Submit failed");
  }
}
