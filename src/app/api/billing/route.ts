import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async (request: NextRequest) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  try {
    const sp = request.nextUrl.searchParams;
    const filters = {
      startDate: sp.get("startDate") ?? undefined,
      endDate: sp.get("endDate") ?? undefined,
      status: (sp.get("status") as "COMPLETED" | "REFUNDED") ?? undefined,
      paymentMethod: (sp.get("paymentMethod") as "CASH" | "CARD" | "UPI") ?? undefined,
      search: sp.get("search") ?? undefined,
    };
    const sales = await billingService.getSales(user.orgId!, filters);
    return NextResponse.json(sales);
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = async (request: NextRequest) => {
  let user;
  try { 
    user = await requireOrgAuth(); 
  }
  catch { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
  }

  if (!user.storeId) {
    return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const sale = await billingService.createSale(user.orgId!, user.storeId, user.id, body);
    return NextResponse.json(sale, { status: 201 });
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

