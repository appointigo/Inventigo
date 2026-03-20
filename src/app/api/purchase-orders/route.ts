import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    supplierId: searchParams.get("supplierId") || undefined,
    status: searchParams.get("status") as import("@prisma/client").PurchaseOrderStatus | undefined,
  };
  const orders = await poService.list(filters);
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.supplierId || !body.items?.length) {
    return NextResponse.json({ error: "supplierId and items are required" }, { status: 400 });
  }
  // In production, get userId from session via requireAuth()
  const po = await poService.create(body, "user-1", "Admin User");
  return NextResponse.json(po, { status: 201 });
}
