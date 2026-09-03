import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export async function POST() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === "OWNER" || user.role === "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await createMetaBackend().signup.sync(user.orgId)); }
  catch (error) {
    const code = isWhatsAppError(error) ? error.code : "META_PROVIDER_FAILED";
    return NextResponse.json({ error: "WhatsApp sync failed", code }, { status: code === "WHATSAPP_NOT_CONNECTED" ? 409 : 502 });
  }
}
