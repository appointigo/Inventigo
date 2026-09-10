import assert from "node:assert/strict";
import test from "node:test";
import { validateEmbeddedSignupAuthorization } from "../embeddedSignupAuthorization.ts";

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

test("rejects an invalid token as META_AUTH_FAILED", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection: { ...inspection, isValid: false },
    expectedAppId: "app-id",
  }), hasCode("META_AUTH_FAILED"));
});

test("rejects a token issued for a different Meta App", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection,
    expectedAppId: "different-app",
  }), hasCode("META_AUTH_FAILED"));
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
      error.code !== "META_AUTH_FAILED" ||
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
  }), hasCode("META_WABA_NOT_FOUND"));
});

test("rejects a frontend-selected WABA not granted by the token", () => {
  assert.throws(() => validateEmbeddedSignupAuthorization({
    inspection,
    expectedAppId: "app-id",
    selectedWabaIds: ["waba-2"],
  }), hasCode("EMBEDDED_SIGNUP_ASSET_MISMATCH"));
});
