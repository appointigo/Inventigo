import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { EMBEDDED_SIGNUP_STATE_COOKIE, verifyEmbeddedSignupState } from "@/modules/whatsapp/security/embeddedSignupState";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
const schema = z.object({ requestId: z.string().uuid(), code: z.string().min(1).max(4096), state: z.string().min(20).max(200), selectedWabaIds: z.array(z.string().regex(/^\d+$/)).max(20).optional(), registration: z.object({ phoneNumberId: z.string().regex(/^\d+$/), pin: z.string().regex(/^\d{6}$/) }).optional() });
const completionClaims = new Map<string, number>();
const COMPLETION_CLAIM_TTL_MS = 10 * 60 * 1000;
const clearSignupState = (response: NextResponse) => { response.cookies.delete(EMBEDDED_SIGNUP_STATE_COOKIE); return response; };
const userMessage = (code: string) => {
  if (code === "META_AUTH_FAILED" || code === "EMBEDDED_SIGNUP_INVALID_CODE") return "Meta authorization could not be verified. Please retry and grant the requested WhatsApp permissions.";
  if (code === "EMBEDDED_SIGNUP_CODE_REUSED") return "This setup attempt was already processed. Please start a new WhatsApp setup.";
  if (code === "META_WABA_NOT_FOUND") return "Meta did not share a WhatsApp Business Account. Please retry and select an account.";
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
  console.info("[WhatsApp Signup] callback_received", {
    requestId,
    organizationId: user.orgId,
    userId: user.id,
    hasAuthorizationCode: Boolean(parsed.data.code),
    authorizationCodeLength: parsed.data.code.length,
    hasState: Boolean(parsed.data.state),
    hasSelectedWabaIds: Boolean(parsed.data.selectedWabaIds?.length),
    selectedWabaCount: parsed.data.selectedWabaIds?.length ?? 0,
  });
  const expected = request.headers.get("cookie")?.match(/(?:^|;\s*)stockiva_whatsapp_signup_state=([^;]+)/)?.[1];
  if (!verifyEmbeddedSignupState(expected ? decodeURIComponent(expected) : undefined, parsed.data.state, user.id, user.orgId)) {
    console.warn("[WhatsApp Signup] FAILED", { requestId, organizationId: user.orgId, step: "state_validation", errorType: "EMBEDDED_SIGNUP_INVALID_STATE", stateCookiePresent: Boolean(expected) });
    return clearSignupState(NextResponse.json({ error: "Invalid signup state", code: "EMBEDDED_SIGNUP_INVALID_STATE", requestId }, { status: 403 }));
  }
  console.info("[WhatsApp Signup] state_validated", { requestId, organizationId: user.orgId });
  const now = Date.now();
  for (const [claimedRequestId, claimedAt] of completionClaims) {
    if (now - claimedAt > COMPLETION_CLAIM_TTL_MS) completionClaims.delete(claimedRequestId);
  }
  if (completionClaims.has(requestId)) {
    console.warn("[WhatsApp Signup] FAILED", {
      requestId,
      organizationId: user.orgId,
      step: "duplicate_completion",
      errorType: "EMBEDDED_SIGNUP_CODE_REUSED",
    });
    return clearSignupState(NextResponse.json({
      error: userMessage("EMBEDDED_SIGNUP_CODE_REUSED"),
      code: "EMBEDDED_SIGNUP_CODE_REUSED",
      requestId,
    }, { status: 409 }));
  }
  completionClaims.set(requestId, now);
  let lastStage = "state_validated";
  try {
    const backend = createMetaBackend();
    const result = await backend.signup.complete({ organizationId: user.orgId, ...parsed.data }, (stage, details) => {
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
      metaErrorType: details?.providerType,
      sanitizedMetaMessage: details?.providerMessage,
      metaTraceId: details?.traceId,
      message: error instanceof Error ? error.message : "Unknown signup error",
    });
    const diagnostic = process.env.NODE_ENV === "development" ? {
      stage: lastStage,
      metaHttpStatus: details?.httpStatus,
      metaErrorCode: details?.providerCode,
      metaErrorSubcode: details?.providerSubcode,
      metaErrorType: details?.providerType,
      sanitizedMetaMessage: details?.providerMessage,
      fbtraceId: details?.traceId,
      authReason: details?.authReason,
      missingScopes: details?.missingScopes,
    } : undefined;
    const status = code === "META_AUTH_FAILED" ? 401 : 502;
    return clearSignupState(NextResponse.json({ error: userMessage(code), code, requestId, diagnostic }, { status }));
  }
}
