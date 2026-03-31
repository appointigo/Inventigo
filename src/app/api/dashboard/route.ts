import { NextResponse } from "next/server";
import { dashboardService } from "@/modules/dashboard/services/dashboardService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async () => {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const data = await dashboardService.getData(user.orgId);
    return NextResponse.json(data);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
