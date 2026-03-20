import { NextResponse } from "next/server";
import { dashboardService } from "@/modules/dashboard/services/dashboardService";

export async function GET() {
  const data = await dashboardService.getData();
  return NextResponse.json(data);
}
