import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { leavePolicyService } from "@/modules/staff/services/leavePolicyService";
import { resolveAccessibleStoreId } from "@/modules/staff/services/staffUtils";
import type { UpdateStoreLeavePolicyInput } from "@/modules/staff/types";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedStoreId = searchParams.get("storeId") ?? user.storeId ?? undefined;
    if (!requestedStoreId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }
    const storeId = await resolveAccessibleStoreId(user, requestedStoreId);
    const data = await leavePolicyService.list(user.orgId, storeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[leave/policy GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load leave policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
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
    const body = await request.json() as { storeId?: string; policies?: UpdateStoreLeavePolicyInput[] };
    if (!body.storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const data = await leavePolicyService.set(user.orgId, body.storeId, body.policies ?? []);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[leave/policy PUT]", error);
    const message = error instanceof Error ? error.message : "Failed to save leave policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}