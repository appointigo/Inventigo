import { NextResponse } from "next/server";
import { supplierService } from "@/modules/suppliers/services/supplierService";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { createSupplierSchema } from "@/modules/suppliers/supplierContracts";
import { ZodError } from "zod";

export async function GET() {
  try {
    const user = await requirePurchaseUser("read");
    const suppliers = await supplierService.list(user.orgId);
    return NextResponse.json(suppliers);
  } catch (error) {
    return purchaseError(error, "Unable to list suppliers");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePurchaseUser("manage");
    const body = createSupplierSchema.parse(await request.json());
    const supplier = await supplierService.create(user.orgId, body);
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid supplier" }, { status: 400 });
    return purchaseError(error, "Unable to create supplier");
  }
}
