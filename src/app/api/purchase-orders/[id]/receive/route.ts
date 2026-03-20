import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (!body.items?.length) {
    return NextResponse.json({ error: "Received items are required" }, { status: 400 });
  }

  try {
    const po = await poService.receivePO(id, body.items);
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Receive failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
