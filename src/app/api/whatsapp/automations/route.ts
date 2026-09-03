import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { automationSchema } from "@/modules/whatsapp/automationSchemas";
import { createWhatsAppAutomationReader } from "@/modules/whatsapp/server";
export async function GET() {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = createWhatsAppAutomationReader();
  return NextResponse.json({ items: await s.list(u.orgId), ...(await s.options(u.orgId)) });
}
export async function POST(r: Request) {
  const u = await requireOrgAuth().catch(() => null);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN", "MANAGER"].includes(u.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = automationSchema.safeParse(await r.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message }, { status: 400 });
  try {
    return NextResponse.json(
      await createWhatsAppAutomationReader().save(u.orgId, undefined, p.data),
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 409 }
    );
  }
}
