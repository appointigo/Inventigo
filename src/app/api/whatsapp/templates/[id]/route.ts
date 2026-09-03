import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createWhatsAppTemplateService } from "@/modules/whatsapp/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await createWhatsAppTemplateService().get(user.orgId, (await context.params).id)); }
  catch (error) { return NextResponse.json({ error: isWhatsAppError(error) ? "Template not found" : "Unable to load template" }, { status: isWhatsAppError(error) ? 404 : 500 }); }
}
