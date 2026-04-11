import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { leaveService } from "@/modules/staff/services/leaveService";
import type { LeaveApplicationInput } from "@/modules/staff/types";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as LeaveApplicationInput;
    const record = await leaveService.apply(user, body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[leave/apply POST]", error);
    const message = error instanceof Error ? error.message : "Leave application failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}