import { NextResponse } from "next/server";
import { billingService } from "@/modules/billing/services/billingService";

export async function GET() {
  const kpis = await billingService.getSalesKPIs();
  return NextResponse.json(kpis);
}
