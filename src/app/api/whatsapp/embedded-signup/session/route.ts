import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createMetaBackend } from "@/modules/whatsapp/server";
import { WhatsAppPlatformConfigurationError } from "@/modules/whatsapp/config";
import { createEmbeddedSignupState, createEmbeddedSignupStateCookie, EMBEDDED_SIGNUP_STATE_COOKIE } from "@/modules/whatsapp/security/embeddedSignupState";

export const runtime = "nodejs";
export async function POST() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { config } = createMetaBackend(); const state = createEmbeddedSignupState(); const requestId = randomUUID();
    console.info("[WhatsApp Signup] signup_started", { requestId, organizationId: user.orgId, userId: user.id });
    const response = NextResponse.json({ state, requestId, appId: config.appId, configId: config.embeddedSignupConfigId, redirectUri: config.embeddedSignupRedirectUri, graphApiVersion: config.graphApiVersion });
    response.cookies.set(EMBEDDED_SIGNUP_STATE_COOKIE, createEmbeddedSignupStateCookie(state, user.id, user.orgId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/whatsapp/embedded-signup", maxAge: 600 });
    return response;
  } catch (error) {
    if (error instanceof WhatsAppPlatformConfigurationError) {
      console.warn("WhatsApp Embedded Signup configuration rejected", {
        code: error.code,
        organizationId: user.orgId,
        userId: user.id,
      });
      const message =
        error.code === "WHATSAPP_SETUP_DISABLED"
          ? "WhatsApp setup is disabled for this environment."
          : "Meta Embedded Signup is not configured for this environment.";
      return NextResponse.json({ error: message, code: error.code }, { status: 409 });
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
