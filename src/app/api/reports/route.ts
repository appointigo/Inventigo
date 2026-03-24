import { NextResponse } from "next/server";
import { reportsService } from "@/modules/dashboard/services/reportsService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") ?? "stock";

    if (reportType === "stock") {
      const filters = {
        categoryName: searchParams.get("categoryName") || undefined,
        brandName: searchParams.get("brandName") || undefined,
        status: (searchParams.get("status") as "OK" | "LOW" | "OUT") || undefined,
      };
      const data = await reportsService.getStockReport(filters);
      return NextResponse.json(data);
    }

    if (reportType === "movements") {
      const filters = {
        type: searchParams.get("movementType") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      };
      const data = await reportsService.getMovementReport(filters);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
