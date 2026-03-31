import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async () => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  const lowStockItems = await alertService.checkStockLevels(user.orgId);
  return NextResponse.json(lowStockItems);
}
