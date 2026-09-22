import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import {
  DemandAccessError,
  DemandValidationError,
  demandIntelligenceService,
} from "@/modules/demand-intelligence/services/demandIntelligenceService";
import { customerVisitPatchSchema } from "@/modules/demand-intelligence/utils/demandValidation";

const handleError = (error: unknown) => {
  if (error instanceof DemandAccessError)
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof DemandValidationError)
    return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("[customer-visits/:id]", error);
  return NextResponse.json({ error: "Unable to process customer visit" }, { status: 500 });
};

export async function GET(_request: Request, context: RouteContext<"/api/customer-visits/[id]">) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    return NextResponse.json(await demandIntelligenceService.get(user.orgId, user.storeId, id));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/customer-visits/[id]">) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = customerVisitPatchSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid visit update", issues: parsed.error.issues },
        { status: 400 }
      );
    const { id } = await context.params;
    return NextResponse.json(
      await demandIntelligenceService.update(user.orgId, user.storeId, id, parsed.data)
    );
  } catch (error) {
    return handleError(error);
  }
}
