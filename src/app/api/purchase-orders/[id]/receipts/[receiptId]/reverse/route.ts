import { poService } from "@/modules/purchase-orders/services/poService";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; receiptId: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id, receiptId } = await params;
    const body = await request.json();
    const confirmationId = request.headers.get("idempotency-key")?.trim() || body.confirmationId;
    return Response.json(await poService.reverseReceipt(id, receiptId, user.orgId, user.id, confirmationId, body.reason, user.storeId));
  } catch (error) {
    return purchaseError(error, "Unable to reverse receipt");
  }
}
