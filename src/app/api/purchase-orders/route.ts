import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const storeId = user.storeId ?? searchParams.get("storeId") ?? undefined;
    const filters = {
      storeId,
      supplierId: searchParams.get("supplierId") || undefined,
      status: searchParams.get("status") as import("@prisma/client").PurchaseOrderStatus | undefined,
    };
    const orders = await poService.list(filters, user.orgId);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body.supplierId || !body.items?.length) {
      return NextResponse.json({ error: "supplierId and items are required" }, { status: 400 });
    }
    const po = await poService.create(body, user.id);
    return NextResponse.json(po, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
