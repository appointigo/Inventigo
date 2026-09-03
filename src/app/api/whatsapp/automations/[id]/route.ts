import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { automationSchema } from "@/modules/whatsapp/automationSchemas";
import { createWhatsAppAutomationReader } from "@/modules/whatsapp/server";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN", "MANAGER"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = automationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    return NextResponse.json(
      await createWhatsAppAutomationReader().save(
        user.orgId,
        (await context.params).id,
        parsed.data
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 409 }
    );
  }
}
export async function DELETE(_: Request, context: Context) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await createWhatsAppAutomationReader().remove(user.orgId, (await context.params).id);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }
}
