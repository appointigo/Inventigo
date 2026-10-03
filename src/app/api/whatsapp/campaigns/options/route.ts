import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppCampaignService } from "@/modules/whatsapp/server";
export async function GET() {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await createWhatsAppCampaignService().options(u.orgId));
}
