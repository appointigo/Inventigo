import assert from "node:assert/strict";
import test from "node:test";
import { isEmbeddedSignupPhoneRegistered, selectEmbeddedSignupPhoneNumber, validateEmbeddedSignupAuthorization } from "../embeddedSignupAuthorization.ts";

const inspection = {
  appId: "app-id",
  isValid: true,
  scopes: ["whatsapp_business_messaging"],
  granularScopes: [{
    scope: "whatsapp_business_management",
    targetIds: ["waba-1"],
  }],
};

const hasCode = (code: string) => (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === code;

test("accepts a valid token and discovers its granted WABA", () => {
  assert.deepEqual(validateEmbeddedSignupAuthorization({
    inspection,
    expectedAppId: "app-id",
  }), ["waba-1"]);
});

test("rejects an invalid token as META_TOKEN_INVALID", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection: { ...inspection, isValid: false },
    expectedAppId: "app-id",
  }), hasCode("META_TOKEN_INVALID"));
});

test("rejects a token issued for a different Meta App", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection,
    expectedAppId: "different-app",
  }), hasCode("META_TOKEN_INVALID"));
});

test("reports required scopes that were not granted", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection: { ...inspection, scopes: [], granularScopes: [] },
    expectedAppId: "app-id",
  }), (error: unknown) => {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "META_PERMISSION_MISSING" ||
      !("details" in error)
    ) return false;
    const details = error.details as { missingScopes?: string[] };
    return details.missingScopes?.includes("whatsapp_business_management") === true &&
      details.missingScopes.includes("whatsapp_business_messaging");
  });
});

test("a valid token without a granted WABA is not labeled as auth failure", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection: {
      ...inspection,
      scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      granularScopes: [],
    },
    expectedAppId: "app-id",
  }), hasCode("WABA_NOT_FOUND"));
});

test("rejects a frontend-selected WABA not granted by the token", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection,
    expectedAppId: "app-id",
    selectedWabaIds: ["waba-2"],
  }), hasCode("EMBEDDED_SIGNUP_ASSET_MISMATCH"));
});

test("requires an explicit choice when multiple WABAs are authorized", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection: {
      ...inspection,
      granularScopes: [{
        scope: "whatsapp_business_management",
        targetIds: ["waba-1", "waba-2"],
      }],
    },
    expectedAppId: "app-id",
  }), (error: unknown) => {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "MULTIPLE_WABAS_REQUIRE_SELECTION" ||
      !("details" in error)
    ) return false;
    return JSON.stringify((error.details as Record<string, unknown>).candidateWabaIds) === JSON.stringify(["waba-1", "waba-2"]);
  });
});

test("accepts one explicitly selected WABA from multiple authorized targets", () => {
  assert.deepEqual(validateEmbeddedSignupAuthorization({
    inspection: {
      ...inspection,
      granularScopes: [{
        scope: "whatsapp_business_management",
        targetIds: ["waba-1", "waba-2"],
      }],
    },
    expectedAppId: "app-id",
    selectedWabaIds: ["waba-2"],
  }), ["waba-2"]);
});

const phones = [
  { id: "phone-1", displayPhoneNumber: "+91 90000 00001", verifiedName: "Primary" },
  { id: "phone-2", displayPhoneNumber: "+91 90000 00002", verifiedName: "Support" },
];

test("selects the only discovered phone number automatically", () => {
  assert.deepEqual(selectEmbeddedSignupPhoneNumber([phones[0]!]), phones[0]);
});

test("requires explicit selection when multiple phone numbers are discovered", () => {
  assert.throws(() => selectEmbeddedSignupPhoneNumber(phones), (error: unknown) => {
    if (
      typeof error !== "object" || error === null || !("code" in error) ||
      error.code !== "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION" || !("details" in error)
    ) return false;
    const candidates = (error.details as Record<string, unknown>).candidatePhoneNumbers as unknown[];
    return candidates.length === 2;
  });
});

test("accepts only a discovered phone-number selection", () => {
  assert.deepEqual(selectEmbeddedSignupPhoneNumber(phones, "phone-2"), phones[1]);
  assert.throws(() => selectEmbeddedSignupPhoneNumber(phones, "phone-other"), hasCode("EMBEDDED_SIGNUP_ASSET_MISMATCH"));
});

test("reports when no phone number exists", () => {
  assert.throws(() => selectEmbeddedSignupPhoneNumber([]), hasCode("PHONE_NUMBER_NOT_FOUND"));
});

test("treats only an operationally connected phone as already registered", () => {
  assert.equal(isEmbeddedSignupPhoneRegistered({ ...phones[0]!, status: "CONNECTED" }), true);
  assert.equal(isEmbeddedSignupPhoneRegistered({ ...phones[0]!, status: "PENDING", codeVerificationStatus: "VERIFIED" }), false);
  assert.equal(isEmbeddedSignupPhoneRegistered({ ...phones[0]!, codeVerificationStatus: "VERIFIED" }), false);
});
