import { NextResponse } from "next/server";
import { storeService } from "@/modules/settings/services/storeService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  const { id } = await params;
  const store = await storeService.getById(user.orgId, id);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json(store);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const store = await storeService.update(user.orgId, id, body);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json(store);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await storeService.delete(user.orgId, id);
  if (!deleted) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
