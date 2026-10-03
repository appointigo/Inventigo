import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppTemplateService } from "@/modules/whatsapp/server";

export async function GET() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(
      await createWhatsAppTemplateService().creationOptions(user.orgId)
    );
  } catch {
    return NextResponse.json(
      {
        error: "Template creation options could not be loaded",
        code: "TEMPLATE_CREATE_FAILED",
      },
      { status: 500 }
    );
  }
}
