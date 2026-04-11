import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { attendanceService } from "@/modules/staff/services/attendanceService";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const data = await attendanceService.history(user, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      userId: searchParams.get("userId"),
      storeId: searchParams.get("storeId"),
      status: searchParams.get("status"),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[attendance/history GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load attendance history";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}