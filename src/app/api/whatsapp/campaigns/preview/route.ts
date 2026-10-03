import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { campaignPreviewSchema } from "@/modules/whatsapp/campaignSchemas";
import { createWhatsAppCampaignService } from "@/modules/whatsapp/server";
export async function POST(r: Request) {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = campaignPreviewSchema.safeParse(await r.json().catch(() => null));
  if (!p.success)
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? "Invalid audience" },
      { status: 400 }
    );
  try {
    return NextResponse.json(await createWhatsAppCampaignService().preview(u.orgId, p.data));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Preview failed" },
      { status: 409 }
    );
  }
}
