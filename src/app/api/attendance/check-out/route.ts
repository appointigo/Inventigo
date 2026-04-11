import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { attendanceService } from "@/modules/staff/services/attendanceService";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { storeId?: string | null };
    const record = await attendanceService.checkOut(user, body.storeId);
    return NextResponse.json(record);
  } catch (error) {
    console.error("[attendance/check-out POST]", error);
    const message = error instanceof Error ? error.message : "Clock out failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}