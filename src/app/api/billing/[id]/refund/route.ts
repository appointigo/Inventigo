import { NextRequest, NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sale = await billingService.refundSale(id);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found or already refunded" }, { status: 404 });
  }
  return NextResponse.json(sale);
}
