import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const config = await alertService.getById(id, user.orgId);
  if (!config) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const body = await request.json();
  const updated = await alertService.update(id, user.orgId, body);
  if (!updated) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const deleted = await alertService.delete(id, user.orgId);
  if (!deleted) {
    return NextResponse.json({ error: "Alert config not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
