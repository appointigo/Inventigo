import { NextResponse } from "next/server";
import { supplierService } from "@/modules/suppliers/services/supplierService";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { updateSupplierSchema } from "@/modules/suppliers/supplierContracts";
import { ZodError } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("read");
    const { id } = await params;
    const supplier = await supplierService.getById(user.orgId, id);
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error) {
    return purchaseError(error, "Unable to load supplier");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const body = updateSupplierSchema.parse(await request.json());
    const supplier = await supplierService.update(user.orgId, id, body);
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid supplier" }, { status: 400 });
    return purchaseError(error, "Unable to update supplier");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePurchaseUser("manage");
    const { id } = await params;
    const deleted = await supplierService.delete(user.orgId, id);
    if (!deleted) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return purchaseError(err, "Delete failed");
  }
}
