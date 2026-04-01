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
    const result = await stockService.getMovementHistory({ storeId });
    return NextResponse.json(result.items);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
