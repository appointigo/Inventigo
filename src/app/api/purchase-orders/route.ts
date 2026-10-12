import { NextResponse } from "next/server";
import { poService } from "@/modules/purchase-orders/services/poService";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { contractError, createPurchaseOrderSchema } from "@/modules/purchase-orders/purchaseContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
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
    return purchaseError(error, "Unable to list purchase orders");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePurchaseUser("manage");
    const body = await request.json();
    const scope = await resolveAnalyticsStore(user, body.storeId ?? null);
    const input = createPurchaseOrderSchema.parse({ ...body, storeId: scope.storeId });
    const po = await poService.create(input, user.id, user.orgId);
    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: contractError(error) }, { status: 400 });
    }
    return purchaseError(error, "Unable to create purchase order");
  }
}
