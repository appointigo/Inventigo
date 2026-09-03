import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { campaignSchema } from "@/modules/whatsapp/campaignSchemas";
import { createWhatsAppCampaignService } from "@/modules/whatsapp/server";
export async function GET() {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await createWhatsAppCampaignService().list(u.orgId));
}
export async function POST(r: Request) {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN", "MANAGER"] as string[]).includes(u.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = campaignSchema.safeParse(await r.json().catch(() => null));
  if (!p.success)
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? "Invalid campaign" },
      { status: 400 }
    );
  try {
    return NextResponse.json(await createWhatsAppCampaignService().create(u.orgId, p.data), {
      status: 201,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Campaign creation failed" },
      { status: 409 }
    );
  }
}
