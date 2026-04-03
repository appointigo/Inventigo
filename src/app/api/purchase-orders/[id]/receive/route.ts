import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  if (!body.items?.length) {
    return NextResponse.json({ error: "Received items are required" }, { status: 400 });
  }

  try {
    const po = await poService.receivePO(id, user.orgId, body.items, user.id);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Receive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
