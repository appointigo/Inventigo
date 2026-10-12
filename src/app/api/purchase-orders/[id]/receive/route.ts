import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { contractError, receivePurchaseOrderSchema } from "@/modules/purchase-orders/purchaseContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { ZodError } from "zod";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const requestId = request.headers.get("idempotency-key")?.trim();
    const body = await request.json();
    const input = receivePurchaseOrderSchema.parse({
      ...body,
      confirmationId: requestId || body.confirmationId,
    });
    const po = await poService.receivePO(id, user.orgId, input.items, user.id, {
      confirmationId: input.confirmationId,
      receivedAt: input.receivedAt,
      receiptReference: input.receiptReference,
      supplierInvoiceNumber: input.supplierInvoiceNumber,
      notes: input.notes,
    }, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: contractError(err) }, { status: 400 });
    return purchaseError(err, "Receive failed");
  }
}
