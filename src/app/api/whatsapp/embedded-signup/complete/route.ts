import { z } from "zod";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { isWhatsAppError } from "@/modules/whatsapp/errors";
import { EMBEDDED_SIGNUP_STATE_COOKIE, verifyEmbeddedSignupState } from "@/modules/whatsapp/security/embeddedSignupState";
import { createMetaBackend } from "@/modules/whatsapp/server";

export const runtime = "nodejs";
const schema = z.object({ requestId: z.string().uuid(), code: z.string().min(1).max(4096), state: z.string().min(20).max(200), selectedWabaIds: z.array(z.string().regex(/^\d+$/)).max(20).optional(), selectedPhoneNumberId: z.string().regex(/^\d+$/).optional(), registration: z.object({ phoneNumberId: z.string().regex(/^\d+$/), pin: z.string().regex(/^\d{6}$/) }).optional() });
const completionClaims = new Map<string, number>();
const COMPLETION_CLAIM_TTL_MS = 10 * 60 * 1000;
const clearSignupState = (response: NextResponse) => { response.cookies.delete(EMBEDDED_SIGNUP_STATE_COOKIE); return response; };
const devCheckpoint = (event: string, details: Record<string, unknown> = {}) => {
  if (process.env.NODE_ENV === "development") {
    console.info(`[WhatsApp Complete] ${event} ${JSON.stringify(details)}`);
  }
};
const userMessage = (code: string) => {
  if (code === "META_AUTH_FAILED" || code === "META_TOKEN_INVALID" || code === "EMBEDDED_SIGNUP_INVALID_CODE") return "Meta authorization could not be verified. Please start a fresh WhatsApp setup.";
  if (code === "META_PERMISSION_MISSING") return "Meta did not grant the required WhatsApp permissions. Please retry and grant both management and messaging access.";
  if (code === "EMBEDDED_SIGNUP_CODE_REUSED") return "This setup attempt was already processed. Please start a new WhatsApp setup.";
  if (code === "META_WABA_NOT_FOUND" || code === "WABA_NOT_FOUND") return "Meta did not share a WhatsApp Business Account. Please retry and select an account.";
  if (code === "MULTIPLE_WABAS_REQUIRE_SELECTION") return "Choose one authorized WhatsApp Business Account to continue.";
  if (code === "PHONE_NUMBER_NOT_FOUND") return "No WhatsApp phone number was found. Add and verify a number in WhatsApp Manager, then try again.";
  if (code === "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION") return "Choose one WhatsApp phone number to continue.";
  if (code === "WEBHOOK_SUBSCRIPTION_FAILED") return "Stockiva could not subscribe to WhatsApp updates. Please retry.";
  if (code === "PHONE_REGISTRATION_REQUIRED") return "This WhatsApp phone number requires a six-digit two-step verification PIN before setup can continue.";
  if (code === "PHONE_REGISTRATION_FAILED") return "Meta could not complete Cloud API phone registration. Verify the PIN and phone state, then start a fresh setup.";
  if (code === "WABA_ALREADY_LINKED") return "This WhatsApp Business Account is already connected to another Stockiva organization.";
  if (code === "PHONE_ALREADY_LINKED") return "This WhatsApp phone number is already connected to another Stockiva organization.";
  if (code === "EMBEDDED_SIGNUP_ASSET_MISMATCH") return "The selected WhatsApp Business Account was not granted to this signup attempt.";
  if (code === "META_TIMEOUT") return "Meta took too long to respond. Please retry.";
  if (code === "META_RATE_LIMITED") return "Meta is temporarily rate limiting setup requests. Please try again shortly.";
  return "WhatsApp connection could not be completed";
};
const errorStatus = (code: string) => {
  if (code === "META_AUTH_FAILED" || code === "META_TOKEN_INVALID" || code === "EMBEDDED_SIGNUP_INVALID_CODE") return 401;
  if (code === "META_PERMISSION_MISSING") return 403;
  if (code === "META_WABA_NOT_FOUND" || code === "WABA_NOT_FOUND" || code === "EMBEDDED_SIGNUP_ASSET_MISMATCH") return 422;
  if (code === "MULTIPLE_WABAS_REQUIRE_SELECTION") return 409;
  if (code === "PHONE_NUMBER_NOT_FOUND") return 422;
  if (code === "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION") return 409;
  if (code === "WEBHOOK_SUBSCRIPTION_FAILED") return 502;
  if (code === "PHONE_REGISTRATION_REQUIRED") return 409;
  if (code === "WABA_ALREADY_LINKED" || code === "PHONE_ALREADY_LINKED") return 409;
  if (code === "PHONE_REGISTRATION_FAILED") return 502;
  if (code === "META_RATE_LIMITED" || code === "META_TIMEOUT") return 503;
  return 500;
};

async function completeEmbeddedSignup(request: Request, startedAt: number) {
  devCheckpoint("request_received");
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  devCheckpoint("authenticated", { organizationId: user.orgId, userId: user.id });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { requestId } = parsed.data;
  devCheckpoint("request_validated", { requestId });
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
  devCheckpoint("state_validated", { requestId });
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
    devCheckpoint("code_exchange_config", {
      requestId,
      redirectUriPresent: true,
    });
    const result = await backend.signup.complete({ organizationId: user.orgId, ...parsed.data }, (stage, details) => {
      lastStage = stage;
      console.info(`[WhatsApp Signup] ${stage}`, { requestId, organizationId: user.orgId, ...details });
    });
    const response = clearSignupState(NextResponse.json(result));
    devCheckpoint("response_sent", { requestId, status: 200, durationMs: Date.now() - startedAt });
    return response;
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
      metaContentType: details?.contentType,
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
      metaContentType: details?.contentType,
      sanitizedMetaMessage: details?.providerMessage,
      fbtraceId: details?.traceId,
      authReason: details?.authReason,
      missingScopes: details?.missingScopes,
    } : undefined;
    const status = errorStatus(code);
    const selection = code === "MULTIPLE_WABAS_REQUIRE_SELECTION" && Array.isArray(details?.candidateWabaIds)
      ? { type: "WABA", candidateIds: details.candidateWabaIds }
      : code === "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION" && Array.isArray(details?.candidatePhoneNumbers)
        ? { type: "PHONE_NUMBER", candidates: details.candidatePhoneNumbers }
        : undefined;
    const registration = code === "PHONE_REGISTRATION_REQUIRED" && typeof details?.phoneNumberId === "string"
      ? { required: true, phoneNumberId: details.phoneNumberId }
      : undefined;
    devCheckpoint("failed", {
      requestId,
      step: lastStage,
      status,
      errorType: code,
      metaHttpStatus: details?.httpStatus,
      metaErrorCode: details?.providerCode,
      metaErrorSubcode: details?.providerSubcode,
      metaErrorType: details?.providerType,
      metaContentType: details?.contentType,
      sanitizedMetaMessage: details?.providerMessage,
      durationMs: Date.now() - startedAt,
    });
    return clearSignupState(NextResponse.json({ error: userMessage(code), code, requestId, diagnostic, selection, registration }, { status }));
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    return await completeEmbeddedSignup(request, startedAt);
  } catch (error) {
    console.error(`[WhatsApp Complete] unhandled_failure ${JSON.stringify({
      errorType: error instanceof Error ? error.name : "UnknownError",
      durationMs: Date.now() - startedAt,
    })}`);
    return NextResponse.json(
      { error: "WhatsApp setup could not be completed.", code: "META_PROVIDER_FAILED" },
      { status: 500 }
    );
  }
}
