import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { mockStockService } from "@/modules/stock/services/mockStockService";

export const GET = async () => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const movements = await mockStockService.getMovements(user.orgId);
    return NextResponse.json(movements);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
