import "server-only";
import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(expected: string | undefined, authorization: string | null) {
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
