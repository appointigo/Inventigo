import { NextResponse } from "next/server";
import { storeService } from "@/modules/settings/services/storeService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET() {
  let user;
  try {
    user = await requireOrgAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  const stores = await storeService.list(user.orgId);
  return NextResponse.json(stores);
}

export async function POST(request: Request) {
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
  const body = await request.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 });
  }
  try {
    const store = await storeService.create(user.orgId, body);
    return NextResponse.json(store, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
