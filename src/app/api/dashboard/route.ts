import { NextResponse } from "next/server";
import { dashboardService } from "@/modules/dashboard/services/dashboardService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (request: Request) => {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { searchParams } = new URL(request.url);
    // Prefer storeId from query param (client store switcher), fall back to session storeId
    const storeId = searchParams.get("storeId") ?? user.storeId ?? null;
    const data = await dashboardService.getData(user.orgId, storeId);
    return NextResponse.json(data);
  } 
  catch (err) {
    console.error("[dashboard GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
