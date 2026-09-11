import assert from "node:assert/strict";
import test from "node:test";
import { WHATSAPP_ERROR_CODES } from "../errors.ts";

test("declares controlled post-OAuth onboarding error codes", () => {
  const codes = new Set<string>(WHATSAPP_ERROR_CODES);
  for (const code of [
    "META_TOKEN_INVALID",
    "META_PERMISSION_MISSING",
    "WABA_NOT_FOUND",
    "MULTIPLE_WABAS_REQUIRE_SELECTION",
    "PHONE_NUMBER_NOT_FOUND",
    "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION",
    "WABA_ALREADY_LINKED",
    "PHONE_ALREADY_LINKED",
    "SYSTEM_USER_ACCESS_MISSING",
    "WEBHOOK_SUBSCRIPTION_FAILED",
    "PHONE_REGISTRATION_REQUIRED",
    "PHONE_REGISTRATION_FAILED",
    "TEMPLATE_SYNC_FAILED",
  ]) assert.equal(codes.has(code), true, `${code} must be controlled`);
});
