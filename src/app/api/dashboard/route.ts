import { NextResponse } from "next/server";
import { dashboardService } from "@/modules/dashboard/services/dashboardService";

export async function GET() {
  try {
    const data = await dashboardService.getData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
