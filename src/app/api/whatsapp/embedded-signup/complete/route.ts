import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { EMBEDDED_SIGNUP_STATE_COOKIE, verifyEmbeddedSignupState } from "@/modules/whatsapp/security/embeddedSignupState";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
const schema = z.object({ requestId: z.string().uuid(), code: z.string().min(1).max(4096), state: z.string().min(20).max(200), selectedWabaIds: z.array(z.string().regex(/^\d+$/)).max(20).optional(), registration: z.object({ phoneNumberId: z.string().regex(/^\d+$/), pin: z.string().regex(/^\d{6}$/) }).optional() });
const clearSignupState = (response: NextResponse) => { response.cookies.delete(EMBEDDED_SIGNUP_STATE_COOKIE); return response; };
const userMessage = (code: string) => {
  if (code === "META_AUTH_FAILED" || code === "EMBEDDED_SIGNUP_INVALID_CODE") return "Meta authorization could not be verified. Please retry and grant the requested WhatsApp permissions.";
  if (code === "EMBEDDED_SIGNUP_ASSET_MISMATCH") return "The selected WhatsApp Business Account was not granted to this signup attempt.";
  if (code === "META_TIMEOUT") return "Meta took too long to respond. Please retry.";
  if (code === "META_RATE_LIMITED") return "Meta is temporarily rate limiting setup requests. Please try again shortly.";
  return "WhatsApp connection could not be completed";
};
export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { requestId } = parsed.data;
  console.info("[WhatsApp Signup] callback_received", { requestId, organizationId: user.orgId, userId: user.id, authorizationCodePresent: Boolean(parsed.data.code), selectedWabaCount: parsed.data.selectedWabaIds?.length ?? 0 });
  const expected = request.headers.get("cookie")?.match(/(?:^|;\s*)stockiva_whatsapp_signup_state=([^;]+)/)?.[1];
  if (!verifyEmbeddedSignupState(expected ? decodeURIComponent(expected) : undefined, parsed.data.state, user.id, user.orgId)) {
    console.warn("[WhatsApp Signup] FAILED", { requestId, organizationId: user.orgId, step: "state_validation", errorType: "EMBEDDED_SIGNUP_INVALID_STATE", stateCookiePresent: Boolean(expected) });
    return clearSignupState(NextResponse.json({ error: "Invalid signup state", code: "EMBEDDED_SIGNUP_INVALID_STATE", requestId }, { status: 403 }));
  }
  console.info("[WhatsApp Signup] state_validated", { requestId, organizationId: user.orgId });
  let lastStage = "state_validated";
  try {
    const backend = createMetaBackend();
    const result = await backend.signup.complete({ organizationId: user.orgId, redirectUri: backend.config.embeddedSignupRedirectUri, ...parsed.data }, (stage, details) => {
      lastStage = stage;
      console.info(`[WhatsApp Signup] ${stage}`, { requestId, organizationId: user.orgId, ...details });
    });
    return clearSignupState(NextResponse.json(result));
  } catch (error) {
    const code = isWhatsAppError(error) ? error.code : "META_PROVIDER_FAILED";
    const details = isWhatsAppError(error) ? error.details : undefined;
    console.error("[WhatsApp Signup] FAILED", {
      requestId,
      organizationId: user.orgId,
      step: lastStage,
      errorType: code,
      httpStatus: details?.httpStatus,
      metaErrorCode: details?.providerCode,
      metaErrorSubcode: details?.providerSubcode,
      metaTraceId: details?.traceId,
      message: error instanceof Error ? error.message : "Unknown signup error",
    });
    return clearSignupState(NextResponse.json({ error: userMessage(code), code, requestId }, { status: code === "META_AUTH_FAILED" ? 401 : 502 }));
  }
}
