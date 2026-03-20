import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filters = {
    startDate: sp.get("startDate") ?? undefined,
    endDate: sp.get("endDate") ?? undefined,
    status: (sp.get("status") as "COMPLETED" | "REFUNDED") ?? undefined,
    paymentMethod: (sp.get("paymentMethod") as "CASH" | "CARD" | "UPI") ?? undefined,
    search: sp.get("search") ?? undefined,
  };
  const sales = await billingService.getSales(filters);
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sale = await billingService.createSale(body);
  return NextResponse.json(sale, { status: 201 });
}
