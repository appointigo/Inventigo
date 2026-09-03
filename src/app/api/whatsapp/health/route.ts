import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppIntegrationHealthService } from "@/modules/whatsapp/server";
export async function GET() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await createWhatsAppIntegrationHealthService().get(user.orgId));
}
