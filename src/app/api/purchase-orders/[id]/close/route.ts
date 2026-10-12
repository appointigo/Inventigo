import { NextResponse } from "next/server";
import { contractError, closePurchaseOrderSchema } from "@/modules/purchase-orders/purchaseContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { poService } from "@/modules/purchase-orders/services/poService";
import { ZodError } from "zod";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const input = closePurchaseOrderSchema.parse(await request.json());
    const po = await poService.closePO(id, user.orgId, user.id, input.reason, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: contractError(error) }, { status: 400 });
    return purchaseError(error, "Close failed");
  }
}
