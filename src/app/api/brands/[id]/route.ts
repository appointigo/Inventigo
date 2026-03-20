import { NextResponse } from "next/server";
import { brandService } from "@/modules/brands/services/brandService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await brandService.getById(id);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  return NextResponse.json(brand);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const brand = await brandService.update(id, body);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  return NextResponse.json(brand);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deleted = await brandService.delete(id);
    if (!deleted) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
