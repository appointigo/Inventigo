import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockService } from "@/modules/stock/services/stockService";

export const GET = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = user.storeId ?? new URL(request.url).searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      storeId,
      search: searchParams.get("search") || undefined,
      lowStockOnly: searchParams.get("lowStockOnly") === "true" || undefined,
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true" || undefined,
    };
    const result = await stockService.getStockLevels(filters);
    return NextResponse.json(result.items);
  } catch {
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

  const storeId = user.storeId;
  if (!storeId) {
    return NextResponse.json({ error: "User is not assigned to a store" }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (!body.productId || !body.sizeId || body.quantity === undefined || !body.type) {
      return NextResponse.json(
        { error: "productId, sizeId, quantity, and type are required" },
        { status: 400 }
      );
    }
    const result = await stockService.adjustStock({
      productId: body.productId,
      sizeId: body.sizeId,
      storeId,
      quantity: body.quantity,
      type: body.type,
      reason: body.reason,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      userId: user.id,
    });
    return NextResponse.json(result.stockEntry);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Insufficient")) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
