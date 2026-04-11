import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { leaveService } from "@/modules/staff/services/leaveService";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const data = await leaveService.list(user, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      userId: searchParams.get("userId"),
      storeId: searchParams.get("storeId"),
      status: searchParams.get("status"),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[leave/list GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load leave records";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}