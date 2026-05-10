import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (request: NextRequest) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Optional query params like month can be supported later
    const kpis = await billingService.getSalesKPIs(user.orgId!);
    return NextResponse.json(kpis);
  } catch (error) {
    console.error("/api/billing/stats GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
