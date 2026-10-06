import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const filters = {
      storeId: scope.storeId,
      supplierId: searchParams.get("supplierId") || undefined,
      status: searchParams.get("status") as
        | import("@prisma/client").PurchaseOrderStatus
        | undefined,
    };
    const orders = await poService.list(filters, user.orgId);
    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
  if (!(user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const scope = await resolveAnalyticsStore(user, body.storeId ?? null);
    if (!body.supplierId || !body.items?.length) {
      return NextResponse.json({ error: "supplierId and items are required" }, { status: 400 });
    }
    const po = await poService.create({ ...body, storeId: scope.storeId }, user.id);
    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
