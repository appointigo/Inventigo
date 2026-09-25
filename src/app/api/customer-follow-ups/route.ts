import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerFollowUpService } from "@/modules/customers/services/customerFollowUpService";
import type { CustomerFollowUpStatus } from "@prisma/client";
import { createFollowUpSchema } from "@/modules/customers/customerFollowUpSchemas";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const items = await customerFollowUpService.list(user.orgId, user.storeId, { customerId: search.get("customerId") ?? undefined, status: (search.get("status") as CustomerFollowUpStatus | null) ?? undefined });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = createFollowUpSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid follow-up", issues: parsed.error.issues }, { status: 400 });
    const item = await customerFollowUpService.create(user.orgId, user.id, user.storeId, parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid follow-up" }, { status: 400 }); }
}
