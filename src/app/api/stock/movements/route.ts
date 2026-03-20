import { NextResponse } from "next/server";
import { mockStockService } from "@/modules/stock/services/mockStockService";

export async function GET() {
  const movements = await mockStockService.getMovements();
  return NextResponse.json(movements);
}
