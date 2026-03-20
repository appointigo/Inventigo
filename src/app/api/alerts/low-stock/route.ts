import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";

export async function GET() {
  const lowStockItems = await alertService.checkStockLevels();
  return NextResponse.json(lowStockItems);
}
