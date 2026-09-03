import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { EMBEDDED_SIGNUP_STATE_COOKIE, verifyEmbeddedSignupState } from "@/modules/whatsapp/security/embeddedSignupState";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
const schema = z.object({ code: z.string().min(1).max(4096), state: z.string().min(20).max(200), selectedWabaIds: z.array(z.string().regex(/^\d+$/)).max(20).optional(), registration: z.object({ phoneNumberId: z.string().regex(/^\d+$/), pin: z.string().regex(/^\d{6}$/) }).optional() });
export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const expected = request.headers.get("cookie")?.match(/(?:^|;\s*)stockiva_whatsapp_signup_state=([^;]+)/)?.[1];
  if (!verifyEmbeddedSignupState(expected ? decodeURIComponent(expected) : undefined, parsed.data.state)) return NextResponse.json({ error: "Invalid signup state", code: "EMBEDDED_SIGNUP_INVALID_STATE" }, { status: 403 });
  try {
    const result = await createMetaBackend().signup.complete({ organizationId: user.orgId, ...parsed.data });
    const response = NextResponse.json(result); response.cookies.delete(EMBEDDED_SIGNUP_STATE_COOKIE); return response;
  } catch (error) {
    const code = isWhatsAppError(error) ? error.code : "META_PROVIDER_FAILED";
    return NextResponse.json({ error: "WhatsApp connection could not be completed", code }, { status: code === "META_AUTH_FAILED" ? 401 : 502 });
  }
}
