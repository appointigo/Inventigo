import { NextResponse } from "next/server";
import { mockStockService } from "@/modules/stock/services/mockStockService";

export async function GET() {
  try {
    const movements = await mockStockService.getMovements();
    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
