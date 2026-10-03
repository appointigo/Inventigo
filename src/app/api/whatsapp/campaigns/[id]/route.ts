import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { campaignSchema } from "@/modules/whatsapp/campaignSchemas";
import { createWhatsAppCampaignService } from "@/modules/whatsapp/server";
type C = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: C) {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await createWhatsAppCampaignService().get(u.orgId, (await c.params).id)
    );
  } catch {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
}
export async function PUT(r: Request, c: C) {
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
    return NextResponse.json(
      await createWhatsAppCampaignService().update(u.orgId, (await c.params).id, p.data)
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 409 }
    );
  }
}
export async function DELETE(_: Request, c: C) {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(u.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createWhatsAppCampaignService().remove(u.orgId, (await c.params).id)
    );
  } catch {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
}
