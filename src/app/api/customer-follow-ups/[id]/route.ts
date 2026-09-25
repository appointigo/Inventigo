import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerFollowUpService } from "@/modules/customers/services/customerFollowUpService";
import { updateFollowUpSchema } from "@/modules/customers/customerFollowUpSchemas";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const { id } = await context.params; return NextResponse.json(await customerFollowUpService.get(user.orgId, user.storeId, id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Follow-up not found" }, { status: 404 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const parsed = updateFollowUpSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid follow-up update", issues: parsed.error.issues }, { status: 400 }); const { id } = await context.params; return NextResponse.json(await customerFollowUpService.update(user.orgId, user.storeId, id, parsed.data)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid follow-up" }, { status: 400 }); }
}
