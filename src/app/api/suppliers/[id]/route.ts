import { NextResponse } from "next/server";
import { supplierService } from "@/modules/suppliers/services/supplierService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await supplierService.getById(id);
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supplier = await supplierService.update(id, body);
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deleted = await supplierService.delete(id);
    if (!deleted) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
