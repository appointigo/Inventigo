import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = await alertService.getById(id);
  if (!config) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = await alertService.update(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await alertService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
