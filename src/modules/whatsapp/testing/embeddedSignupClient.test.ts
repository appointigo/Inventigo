import assert from "node:assert/strict";
import test from "node:test";
import { buildManualMetaOAuthUrl, claimEmbeddedSignupCompletion, parseEmbeddedSignupMessage, parseMetaOAuthCallback, parseStockivaMetaOAuthMessage, parseStoredMetaOAuthSession, readWhatsAppApiJson, removeMetaOAuthCallbackParameters, STOCKIVA_META_OAUTH_CALLBACK } from "../embeddedSignupClient.ts";

test("builds the manual Meta OAuth URL without browser-side secrets", () => {
  const url = new URL(buildManualMetaOAuthUrl({
    appId: "1069519752307843",
    configId: "1978246409541287",
    graphApiVersion: "v26.0",
    redirectUri: "https://seniors-xml-carmen-spot.trycloudflare.com/dashboard/whatsapp",
    state: "test-state",
  }));

  assert.equal(url.origin, "https://www.facebook.com");
  assert.equal(url.pathname, "/v26.0/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), "1069519752307843");
  assert.equal(url.searchParams.get("config_id"), "1978246409541287");
  assert.equal(url.searchParams.get("redirect_uri"), "https://seniors-xml-carmen-spot.trycloudflare.com/dashboard/whatsapp");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.has("state"), true);
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.equal(url.searchParams.has("access_token"), false);
  assert.equal(url.searchParams.has("channel_url"), false);
});

test("detects a successful Meta OAuth callback", () => {
  assert.deepEqual(parseMetaOAuthCallback("?code=fresh-code&state=12345678901234567890"), {
    kind: "success",
    code: "fresh-code",
    state: "12345678901234567890",
  });
});

test("detects Meta OAuth errors without requiring a code", () => {
  assert.deepEqual(parseMetaOAuthCallback("?error=access_denied&error_reason=user_denied&error_description=Cancelled"), {
    kind: "error",
    error: "access_denied",
    errorReason: "user_denied",
    errorDescription: "Cancelled",
  });
});

test("rejects incomplete Meta OAuth success callbacks", () => {
  assert.deepEqual(parseMetaOAuthCallback("?code=orphaned-code"), {
    kind: "error",
    error: "invalid_oauth_callback",
  });
  assert.equal(parseMetaOAuthCallback("?unrelated=value"), null);
});

test("accepts only typed Stockiva OAuth callback messages", () => {
  assert.deepEqual(parseStockivaMetaOAuthMessage({
    type: STOCKIVA_META_OAUTH_CALLBACK,
    code: "fresh-code",
    state: "12345678901234567890",
  }), {
    kind: "success",
    code: "fresh-code",
    state: "12345678901234567890",
  });
  assert.equal(parseStockivaMetaOAuthMessage({
    type: "UNRELATED_CALLBACK",
    code: "fresh-code",
    state: "12345678901234567890",
  }), null);
});

test("restores only valid non-secret OAuth session metadata", () => {
  const session = {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    appId: "1069519752307843",
    configId: "1978246409541287",
    graphApiVersion: "v26.0",
    redirectUri: "https://seniors-xml-carmen-spot.trycloudflare.com/dashboard/whatsapp",
    state: "12345678901234567890",
  };
  assert.deepEqual(parseStoredMetaOAuthSession(JSON.stringify(session)), session);
  assert.equal(parseStoredMetaOAuthSession(JSON.stringify({ ...session, redirectUri: "javascript:alert(1)" })), null);
  assert.equal(parseStoredMetaOAuthSession("not-json"), null);
  assert.equal("code" in session, false);
});

test("removes OAuth callback parameters while preserving unrelated URL state", () => {
  assert.equal(
    removeMetaOAuthCallbackParameters("https://stockiva.test/dashboard/whatsapp?code=secret-code&state=secret-state&tab=settings#status"),
    "/dashboard/whatsapp?tab=settings#status"
  );
  assert.equal(
    removeMetaOAuthCallbackParameters("https://stockiva.test/dashboard/whatsapp?error=access_denied&error_reason=user_denied&error_description=Cancelled"),
    "/dashboard/whatsapp"
  );
});

test("accepts a Meta Embedded Signup completion event", () => {
  assert.deepEqual(parseEmbeddedSignupMessage("https://www.facebook.com", JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: { waba_id: "123", phone_number_id: "456" } })), { event: "FINISH", wabaId: "123", phoneNumberId: "456" });
});

test("rejects spoofed origins and unrelated messages", () => {
  assert.equal(parseEmbeddedSignupMessage("https://facebook.com.evil.test", JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH" })), null);
  assert.equal(parseEmbeddedSignupMessage("https://www.facebook.com", "not-json"), null);
});

test("submits each Embedded Signup request only once", () => {
  const claims = new Set<string>();
  assert.equal(claimEmbeddedSignupCompletion(claims, "request-1"), true);
  assert.equal(claimEmbeddedSignupCompletion(claims, "request-1"), false);
  assert.equal(claimEmbeddedSignupCompletion(claims, "request-2"), true);
});

test("reads a JSON API response with a charset", async () => {
  const body = await readWhatsAppApiJson<{ ok: boolean }>(
    new Response('{"ok":true}', { headers: { "Content-Type": "application/json; charset=utf-8" } })
  );
  assert.deepEqual(body, { ok: true });
});

test("rejects HTML API responses without exposing their body", async () => {
  await assert.rejects(
    readWhatsAppApiJson(new Response("<!DOCTYPE html><title>Login</title>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })),
    (error: unknown) => error instanceof Error &&
      /Expected a JSON response/.test(error.message) &&
      !error.message.includes("Login")
  );
});

test("reports malformed JSON with a controlled error", async () => {
  await assert.rejects(
    readWhatsAppApiJson(new Response("not-json", {
      headers: { "Content-Type": "application/json" },
    })),
    /invalid JSON response/
  );
});
