import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  DemandAccessError,
  DemandValidationError,
  demandIntelligenceService,
} from "@/modules/demand-intelligence/services/demandIntelligenceService";
import { customerVisitInputSchema } from "@/modules/demand-intelligence/utils/demandValidation";

const errorResponse = (error: unknown) => {
  if (error instanceof DemandAccessError)
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof DemandValidationError)
    return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("[customer-visits]", error);
  return NextResponse.json({ error: "Unable to process customer visit" }, { status: 500 });
};

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = customerVisitInputSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid visit", issues: parsed.error.issues },
        { status: 400 }
      );
    const visit = await demandIntelligenceService.create(
      user.orgId,
      user.id,
      user.storeId,
      parsed.data
    );
    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const params = new URL(request.url).searchParams;
    const storeId = params.get("storeId")?.trim() || user.storeId;
    if (!storeId) return NextResponse.json({ error: "A store is required" }, { status: 400 });
    const end = params.get("end") ? new Date(params.get("end")!) : new Date();
    const start = params.get("start")
      ? new Date(params.get("start")!)
      : new Date(end.getTime() - 30 * 86_400_000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end)
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    return NextResponse.json(
      await demandIntelligenceService.list(user.orgId, user.storeId, storeId, start, end)
    );
  } catch (error) {
    return errorResponse(error);
  }
}
