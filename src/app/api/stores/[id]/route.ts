import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { storeService } from "@/modules/settings/services/storeService";
import { requireAuth, requireRole } from "@/lib/auth.middleware";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } 
  catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const { id } = await params;
  const store = await storeService.getById(id);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json(store);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(Role.ADMIN);
  } 
  catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const store = await storeService.update(id, body);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json(store);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(Role.ADMIN);
  } 
  catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
  
  const { id } = await params;
  const deleted = await storeService.delete(id);
  if (!deleted) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
