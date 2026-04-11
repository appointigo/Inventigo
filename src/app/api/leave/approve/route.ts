import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { leaveService } from "@/modules/staff/services/leaveService";
import type { LeaveDecisionInput } from "@/modules/staff/types";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as LeaveDecisionInput;
    const record = await leaveService.approve(user, body);
    return NextResponse.json(record);
  } catch (error) {
    console.error("[leave/approve POST]", error);
    const message = error instanceof Error ? error.message : "Leave approval failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}