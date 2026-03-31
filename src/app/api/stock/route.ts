import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { mockStockService } from "@/modules/stock/services/mockStockService";

export const GET = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get("search") || undefined,
      lowStockOnly: searchParams.get("lowStockOnly") === "true" || undefined,
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true" || undefined,
    };
    const levels = await mockStockService.getStockLevels(user.orgId, filters);
    return NextResponse.json(levels);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = async (request: Request) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const body = await request.json();
    if (!body.productId || !body.sizeId || body.quantity === undefined || !body.type) {
      return NextResponse.json(
        { error: "productId, sizeId, quantity, and type are required" },
        { status: 400 }
      );
    }
    const result = await mockStockService.adjustStock(user.orgId, body, user.name);
    if (!result) {
      return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
