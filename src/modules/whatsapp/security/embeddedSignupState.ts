import { randomBytes, timingSafeEqual } from "node:crypto";

export const EMBEDDED_SIGNUP_STATE_COOKIE = "stockiva_whatsapp_signup_state";
export const createEmbeddedSignupState = () => randomBytes(32).toString("base64url");
export const createEmbeddedSignupStateCookie = (
  state: string,
  userId: string,
  organizationId: string
) => Buffer.from(JSON.stringify({ state, userId, organizationId })).toString("base64url");
export function verifyEmbeddedSignupState(
  cookie: string | undefined,
  received: string,
  userId: string,
  organizationId: string
) {
  if (!cookie) return false;
  try {
    const parsed = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8")) as {
      state?: unknown;
      userId?: unknown;
      organizationId?: unknown;
    };
    if (
      parsed.userId !== userId ||
      parsed.organizationId !== organizationId ||
      typeof parsed.state !== "string"
    )
      return false;
    const a = Buffer.from(parsed.state),
      b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
