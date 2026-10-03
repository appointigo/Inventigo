import { NextResponse } from "next/server";
import type { WhatsAppSenderPurpose } from "@prisma/client";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppReadinessService } from "@/modules/whatsapp/server";

const purposes = new Set<WhatsAppSenderPurpose>(["DEFAULT", "TRANSACTIONAL", "MARKETING", "SUPPORT"]);
export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const rawPurpose = params.get("purpose") ?? "DEFAULT";
  if (!purposes.has(rawPurpose as WhatsAppSenderPurpose)) return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  try { return NextResponse.json(await createWhatsAppReadinessService().getMessagingReadiness({ organizationId: user.orgId, storeId: params.get("storeId") ?? user.storeId ?? undefined, purpose: rawPurpose as WhatsAppSenderPurpose })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === "STORE_NOT_FOUND" ? "Store not found" : "Unable to evaluate readiness" }, { status: error instanceof Error && error.message === "STORE_NOT_FOUND" ? 404 : 500 }); }
}
