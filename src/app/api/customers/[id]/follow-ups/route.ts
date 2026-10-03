import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerFollowUpService } from "@/modules/customers/services/customerFollowUpService";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  return NextResponse.json(await customerFollowUpService.list(user.orgId, user.storeId, { customerId: id }));
}
