import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { attendanceService } from "@/modules/staff/services/attendanceService";
import type { AttendanceOverrideInput } from "@/modules/staff/types";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as AttendanceOverrideInput;
    const record = await attendanceService.override(user, body);
    return NextResponse.json(record);
  } catch (error) {
    console.error("[attendance/override POST]", error);
    const message = error instanceof Error ? error.message : "Attendance override failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}