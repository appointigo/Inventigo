import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { storeService } from "@/modules/settings/services/storeService";
import { requireAuth, requireRole } from "@/lib/auth.middleware";

export async function GET() {
  try {
    await requireAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  const stores = await storeService.list();
  return NextResponse.json(stores);
}

export async function POST(request: Request) {
  try {
    await requireRole(Role.ADMIN);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
  const body = await request.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 });
  }
  try {
    const store = await storeService.create(body);
    return NextResponse.json(store, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
