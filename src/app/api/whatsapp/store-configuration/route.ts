import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppStoreConfigurationService } from "@/modules/whatsapp/server";
export async function GET() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await createWhatsAppStoreConfigurationService().snapshot(user.orgId));
}
