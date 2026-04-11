import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { weeklyOffService } from "@/modules/staff/services/weeklyOffService";
import type { WeeklyOffDayConfig } from "@/modules/staff/types";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") ?? undefined;
    const configs = await weeklyOffService.list(user.orgId, storeId);
    return NextResponse.json(configs);
  } catch (error) {
    console.error("[weekly-off/set GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load weekly off config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json() as { storeId?: string; days?: WeeklyOffDayConfig[] };
    if (!body.storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }
    const config = await weeklyOffService.set(user.orgId, body.storeId, body.days ?? []);
    return NextResponse.json(config);
  } catch (error) {
    console.error("[weekly-off/set POST]", error);
    const message = error instanceof Error ? error.message : "Failed to save weekly off config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}