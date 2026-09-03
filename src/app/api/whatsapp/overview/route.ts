import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppOverviewService } from "@/modules/whatsapp/server";
export async function GET() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await createWhatsAppOverviewService().get(user.orgId));
  } catch {
    return NextResponse.json({ error: "Unable to load WhatsApp overview" }, { status: 500 });
  }
}
