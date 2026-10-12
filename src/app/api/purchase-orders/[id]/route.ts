import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { contractError, updatePurchaseOrderSchema } from "@/modules/purchase-orders/purchaseContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { ZodError } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("read");
    const { id } = await params;
    const po = await poService.getById(id, user.orgId, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (error) {
    return purchaseError(error, "Unable to load purchase order");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const body = updatePurchaseOrderSchema.parse(await request.json());
    const po = await poService.update(id, user.orgId, body, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: contractError(err) }, { status: 400 });
    return purchaseError(err, "Update failed");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const po = await poService.cancelPO(id, user.orgId, user.storeId);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    return purchaseError(err, "Cancel failed");
  }
}
