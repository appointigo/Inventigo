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

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createWhatsAppTemplateService().removeFromStockiva(
        user.orgId,
        (await context.params).id
      )
    );
  } catch (error) {
    const code = isWhatsAppError(error) ? error.code : "TEMPLATE_DELETE_FAILED";
    return NextResponse.json(
      {
        error: isWhatsAppError(error) ? error.message : "Template could not be removed",
        code,
      },
      { status: code === "TEMPLATE_NOT_FOUND" ? 404 : 409 }
    );
  }
}
