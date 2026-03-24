import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { getAuthUser } from "@/lib/auth.middleware";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      supplierId: searchParams.get("supplierId") || undefined,
      status: searchParams.get("status") as import("@prisma/client").PurchaseOrderStatus | undefined,
    };
    const orders = await poService.list(filters);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.supplierId || !body.items?.length) {
      return NextResponse.json({ error: "supplierId and items are required" }, { status: 400 });
    }
    const user = await getAuthUser();
    const userId = user?.id ?? "unknown";
    const userName = user?.name ?? "Unknown";
    const po = await poService.create(body, userId, userName);
    return NextResponse.json(po, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
