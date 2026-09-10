import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createMetaBackend } from "@/modules/whatsapp/server";
import { WhatsAppPlatformConfigurationError } from "@/modules/whatsapp/config";
import { createEmbeddedSignupState, createEmbeddedSignupStateCookie, EMBEDDED_SIGNUP_STATE_COOKIE } from "@/modules/whatsapp/security/embeddedSignupState";
import { resolveWhatsAppPublicOrigin } from "@/modules/whatsapp/security/origin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { config } = createMetaBackend(); const state = createEmbeddedSignupState(); const requestId = randomUUID();
    const publicOrigin = resolveWhatsAppPublicOrigin(request, config.allowedOrigins);
    if (!publicOrigin) {
      console.warn("WhatsApp Embedded Signup origin rejected", {
        organizationId: user.orgId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: "WhatsApp setup requires an explicitly allowed HTTPS origin.",
          code: "WHATSAPP_ORIGIN_NOT_ALLOWED",
        },
        { status: 403 }
      );
    }
    const redirectUri = new URL("/dashboard/whatsapp", publicOrigin).toString();
    console.info("[WhatsApp Signup] signup_started", { requestId, organizationId: user.orgId, userId: user.id });
    const response = NextResponse.json({ state, requestId, appId: config.appId, configId: config.embeddedSignupConfigId, redirectUri, graphApiVersion: config.graphApiVersion });
    response.cookies.set(EMBEDDED_SIGNUP_STATE_COOKIE, createEmbeddedSignupStateCookie(state, user.id, user.orgId), { httpOnly: true, sameSite: "lax", secure: true, path: "/api/whatsapp/embedded-signup", maxAge: 600 });
    return response;
  } catch (error) {
    if (error instanceof WhatsAppPlatformConfigurationError) {
      console.warn("WhatsApp Embedded Signup configuration rejected", {
        code: error.code,
        disabledReason: error.disabledReason,
        missingConfiguration: error.missingConfiguration,
        reason: error.message,
        organizationId: user.orgId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: "WhatsApp setup is currently unavailable. Please contact your administrator.",
          code: error.code,
        },
        { status: 503 }
      );
    }
    console.error("WhatsApp Embedded Signup session initialization failed", {
      organizationId: user.orgId,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "WhatsApp setup could not be initialized.", code: "WHATSAPP_SETUP_INITIALIZATION_FAILED" },
      { status: 500 }
    );
  }
}
