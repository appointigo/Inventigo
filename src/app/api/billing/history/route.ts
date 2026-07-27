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
    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") ?? "1");
    const limit = Number(sp.get("limit") ?? "20");
    const filters = {
      startDate: sp.get("startDate") ?? undefined,
      endDate: sp.get("endDate") ?? undefined,
      status: (sp.get("status") as "COMPLETED" | "REFUNDED" | "EXCHANGED") ?? undefined,
      paymentMethod: (sp.get("paymentMethod") as "CASH" | "CARD" | "UPI") ?? undefined,
      type: (sp.get("type") as "SALE" | "EXCHANGE" | "RETURN") ?? undefined,
      search: sp.get("search") ?? undefined,
    };

    const result = await billingService.getSalesPaged(user.orgId!, filters, page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("/api/billing/history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
