import { ZodError } from "zod";
import { supplierClaimTransitionSchema } from "@/modules/purchase-orders/purchaseManagementContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { purchaseManagementService } from "@/modules/purchase-orders/services/purchaseManagementService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const input = supplierClaimTransitionSchema.parse(await request.json());
    return Response.json(await purchaseManagementService.transitionClaim(user.orgId, user.id, id, input, user.storeId));
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid claim transition" }, { status: 400 });
    return purchaseError(error, "Unable to update supplier claim");
  }
}
