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
    const record = await attendanceService.checkIn(user, body.storeId);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[attendance/check-in POST]", error);
    const message = error instanceof Error ? error.message : "Clock in failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}