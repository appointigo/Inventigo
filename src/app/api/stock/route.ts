import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockService } from "@/modules/stock/services/stockService";
import { AnalyticsAccessError, resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";

export const GET = async (request: Request) => {
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
      search: searchParams.get("search") || undefined,
      lowStockOnly: searchParams.get("lowStockOnly") === "true" || undefined,
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true" || undefined,
    };
    const result = await stockService.getStockLevels(filters);
    return NextResponse.json(result.items);
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const scope = await resolveAnalyticsStore(user, body.storeId ?? null);
    if (!body.productId || !body.sizeId || body.quantity === undefined || !body.type) {
      return NextResponse.json(
        { error: "productId, sizeId, quantity, and type are required" },
        { status: 400 }
      );
    }
    const result = await stockService.adjustStock({
      orgId: user.orgId,
      productId: body.productId,
      sizeId: body.sizeId,
      storeId: scope.storeId,
      quantity: body.quantity,
      type: body.type,
      operation: body.operation,
      reason: body.reason,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      userId: user.id,
    });
    return NextResponse.json(result.stockEntry);
  } catch (err) {
    if (err instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.startsWith("Insufficient")) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
