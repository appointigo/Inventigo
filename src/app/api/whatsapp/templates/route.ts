import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createMetaBackend, createWhatsAppTemplateService } from "@/modules/whatsapp/server";
import { isWhatsAppError } from "@/modules/whatsapp/errors";

export async function GET() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await createWhatsAppTemplateService().list(user.orgId));
}
export async function POST() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await createMetaBackend().templates.reconcileInvoiceV1({ organizationId: user.orgId })); }
  catch (error) {
    const code = isWhatsAppError(error) ? error.code : "TEMPLATE_SYNC_FAILED";
    return NextResponse.json({ error: "WhatsApp templates could not be synchronized", code }, { status: code === "WHATSAPP_NOT_CONNECTED" ? 409 : 502 });
  }
}
