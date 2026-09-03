import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const EMBEDDED_SIGNUP_STATE_COOKIE = "stockiva_whatsapp_signup_state";
export const createEmbeddedSignupState = () => randomBytes(32).toString("base64url");
export function verifyEmbeddedSignupState(expected: string | undefined, received: string) {
  if (!expected) return false;
  const a = Buffer.from(expected); const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
