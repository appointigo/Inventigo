import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerIntelligenceService } from "@/modules/customers/services/customerIntelligenceService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestedStore = new URL(request.url).searchParams.get("storeId");
  if (user.storeId && requestedStore && requestedStore !== user.storeId) return NextResponse.json({ error: "Store access denied" }, { status: 403 });
  return NextResponse.json(await customerIntelligenceService.insights(user.orgId, requestedStore ?? user.storeId));
}
