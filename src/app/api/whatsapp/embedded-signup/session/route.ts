import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createMetaBackend } from "@/modules/whatsapp/server";
import { createEmbeddedSignupState, createEmbeddedSignupStateCookie, EMBEDDED_SIGNUP_STATE_COOKIE } from "@/modules/whatsapp/security/embeddedSignupState";

export const runtime = "nodejs";
export async function POST() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["OWNER", "ADMIN"] as string[]).includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { config } = createMetaBackend(); const state = createEmbeddedSignupState();
    const response = NextResponse.json({ state, appId: config.appId, configId: config.embeddedSignupConfigId, graphApiVersion: config.graphApiVersion });
    response.cookies.set(EMBEDDED_SIGNUP_STATE_COOKIE, createEmbeddedSignupStateCookie(state, user.id, user.orgId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/whatsapp/embedded-signup", maxAge: 600 });
    return response;
  } catch { return NextResponse.json({ error: "WhatsApp setup is unavailable" }, { status: 503 }); }
}
