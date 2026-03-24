import { NextResponse } from "next/server";
import { mockStockService } from "@/modules/stock/services/mockStockService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get("search") || undefined,
      lowStockOnly: searchParams.get("lowStockOnly") === "true" || undefined,
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true" || undefined,
    };
    const levels = await mockStockService.getStockLevels(filters);
    return NextResponse.json(levels);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.productId || !body.sizeId || body.quantity === undefined || !body.type) {
      return NextResponse.json(
        { error: "productId, sizeId, quantity, and type are required" },
        { status: 400 }
      );
    }
    const result = await mockStockService.adjustStock(body);
    if (!result) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
