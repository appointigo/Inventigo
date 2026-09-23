import assert from "node:assert/strict";
import test from "node:test";
import { HttpMetaWhatsAppClient } from "../clients/HttpMetaWhatsAppClient.ts";
import { WhatsAppError } from "../errors.ts";

const credentials = { save: async () => "ref", resolve: async () => "secret-token", remove: async () => undefined };
const config = { appId: "app", appSecret: "secret", graphApiVersion: "v26.0", timeoutMs: 50 };
const request = { organizationId: "org", credentialRef: "ref", metaPhoneNumberId: "123", recipient: "919999999999", content: { type: "TEXT" as const, text: "Hello" } };
const jsonResponse = (body: unknown, init: ResponseInit = {}) => new Response(
  JSON.stringify(body),
  { ...init, headers: { "Content-Type": "application/json", ...init.headers } }
);

test("sends the verified Cloud API message shape without putting tokens in the URL", async () => {
  let seen: { url?: string; init?: RequestInit } = {};
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    seen = { url: String(url), init }; return jsonResponse({ messages: [{ id: "wamid.1" }] }, { status: 200 });
  });
  const result = await client.sendMessage(request);
  assert.equal(result.providerMessageId, "wamid.1");
  assert.equal(result.httpStatus, 200);
  assert.equal(seen.url, "https://graph.facebook.com/v26.0/123/messages");
  assert.equal((JSON.parse(String(seen.init?.body)) as { messaging_product: string }).messaging_product, "whatsapp");
  assert.ok(!seen.url.includes("secret-token"));
});

test("uploads a PDF and attaches its media id to a template document header", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1
      ? jsonResponse({ id: "media-1" }, { status: 200 })
      : jsonResponse({ messages: [{ id: "wamid.invoice" }] }, { status: 200 });
  });
  const upload = await client.uploadMedia({ organizationId: "org", credentialRef: "ref", metaPhoneNumberId: "123", data: Buffer.from("%PDF-1.4"), mimeType: "application/pdf", filename: "invoice-1001.pdf" });
  await client.sendMessage({
    organizationId: "org",
    credentialRef: "ref",
    metaPhoneNumberId: "123",
    recipient: "919999999999",
    content: { type: "TEMPLATE", template: { key: "invoice", language: "en_US", variables: { "1": "Aarav" }, headerDocument: { id: upload.mediaId, filename: "invoice-1001.pdf" } } },
    template: { metaTemplateName: "invoice_document", language: "en_US" },
  });
  assert.equal(calls[0].url, "https://graph.facebook.com/v26.0/123/media");
  assert.ok(calls[0].init?.body instanceof FormData);
  const sent = JSON.parse(String(calls[1].init?.body));
  assert.equal(sent.template.components[0].parameters[0].document.id, "media-1");
  assert.equal(sent.template.components[0].parameters[0].document.filename, "invoice-1001.pdf");
  assert.equal(sent.template.components[1].parameters[0].text, "Aarav");
});

test("bounds invoice media uploads with the configured Meta timeout", async () => {
  const client = new HttpMetaWhatsAppClient({ ...config, timeoutMs: 5 }, credentials, async (_url, init) => {
    await new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    throw new Error("unreachable");
  });
  await assert.rejects(
    client.uploadMedia({ organizationId: "org", credentialRef: "ref", metaPhoneNumberId: "123", data: Buffer.from("%PDF-1.4"), mimeType: "application/pdf", filename: "invoice.pdf" }),
    (error: unknown) => error instanceof WhatsAppError && error.code === "META_TIMEOUT"
  );
});

for (const [name, status, code, expected] of [["auth", 401, 190, "META_AUTH_FAILED"], ["rate limit", 429, 4, "META_RATE_LIMITED"], ["provider", 500, 2, "META_PROVIDER_FAILED"]] as const) {
  test(`normalizes ${name} errors`, async () => {
    const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({ error: { message: "sensitive provider text", code } }, { status }));
    await assert.rejects(client.sendMessage(request), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === expected);
  });
}

test("normalizes timeouts", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
  await assert.rejects(client.sendMessage(request), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "META_TIMEOUT");
});

test("exchanges a manual Embedded Signup code with the canonical redirect URI", async () => {
  let seenUrl = "";
  const client = new HttpMetaWhatsAppClient(config, credentials, async url => {
    seenUrl = String(url);
    return jsonResponse({ access_token: "meta-token" }, { status: 200 });
  });
  await client.exchangeEmbeddedSignupCode({ code: "short-lived-code" });
  const url = new URL(seenUrl);
  assert.equal(url.searchParams.get("redirect_uri"), "https://seniors-xml-carmen-spot.trycloudflare.com/dashboard/whatsapp");
  assert.equal(url.searchParams.get("code"), "short-lived-code");
});

test("captures safe debug-token metadata", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({ data: {
    app_id: "app",
    is_valid: true,
    type: "USER",
    expires_at: 1_800_000_000,
    data_access_expires_at: 1_900_000_000,
    scopes: ["whatsapp_business_messaging"],
    granular_scopes: [{ scope: "whatsapp_business_management", target_ids: ["123"] }],
  } }, { status: 200 }));
  const inspection = await client.inspectToken("oauth-token");
  assert.equal(inspection.appId, "app");
  assert.equal(inspection.isValid, true);
  assert.equal(inspection.type, "USER");
  assert.equal(inspection.expiresAt?.toISOString(), "2027-01-15T08:00:00.000Z");
  assert.equal(inspection.dataAccessExpiresAt?.toISOString(), "2030-03-17T17:46:40.000Z");
  assert.deepEqual(inspection.scopes, ["whatsapp_business_messaging"]);
  assert.deepEqual(inspection.granularScopes, [{ scope: "whatsapp_business_management", targetIds: ["123"] }]);
});

test("accepts metadata only for the requested authorized WABA", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async url => {
    assert.equal(String(url), "https://graph.facebook.com/v26.0/123?fields=id,name,currency,timezone_id");
    return jsonResponse({ id: "123", name: "Merchant WABA", currency: "INR", timezone_id: "Asia/Kolkata" });
  });
  assert.deepEqual(await client.getWaba("123", "oauth-token"), {
    id: "123",
    name: "Merchant WABA",
    currency: "INR",
    timezoneId: "Asia/Kolkata",
  });
});

test("rejects mismatched WABA metadata", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({ id: "456" }));
  await assert.rejects(client.getWaba("123", "oauth-token"), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "META_INVALID_RESPONSE"
  );
});

test("fetches safe WhatsApp phone-number metadata", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async url => {
    assert.equal(String(url), "https://graph.facebook.com/v26.0/123/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type,status,is_pin_enabled");
    return jsonResponse({ data: [{
      id: "phone-1",
      display_phone_number: "+91 90000 00001",
      verified_name: "Merchant",
      quality_rating: "GREEN",
      name_status: "APPROVED",
      code_verification_status: "VERIFIED",
      platform_type: "CLOUD_API",
      status: "CONNECTED",
      is_pin_enabled: true,
    }] });
  });
  assert.deepEqual(await client.listPhoneNumbers("123", "oauth-token"), [{
    id: "phone-1",
    displayPhoneNumber: "+91 90000 00001",
    verifiedName: "Merchant",
    qualityRating: "GREEN",
    nameStatus: "APPROVED",
    codeVerificationStatus: "VERIFIED",
    platformType: "CLOUD_API",
    status: "CONNECTED",
    isPinEnabled: true,
  }]);
});

test("requires and safely repeats confirmed WABA webhook subscription", async () => {
  let calls = 0;
  const client = new HttpMetaWhatsAppClient(config, credentials, async url => {
    calls += 1;
    assert.equal(String(url), "https://graph.facebook.com/v26.0/123/subscribed_apps");
    return jsonResponse({ success: true });
  });
  await client.subscribeApp("123", "oauth-token");
  await client.subscribeApp("123", "oauth-token");
  assert.equal(calls, 2);
});

test("rejects an unconfirmed WABA webhook subscription", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({ success: false }));
  await assert.rejects(client.subscribeApp("123", "oauth-token"), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "WEBHOOK_SUBSCRIPTION_FAILED"
  );
});

test("requires Meta to confirm phone registration", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    assert.equal(String(url), "https://graph.facebook.com/v26.0/phone-1/register");
    assert.deepEqual(JSON.parse(String(init?.body)), { messaging_product: "whatsapp", pin: "123456" });
    return jsonResponse({ success: true });
  });
  await client.registerPhoneNumber("phone-1", "123456", "oauth-token");
});

test("normalizes phone registration rejection without exposing its PIN", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({
    error: { message: "Invalid registration PIN", code: 100, type: "OAuthException", fbtrace_id: "trace-1" },
  }, { status: 400 }));
  await assert.rejects(client.registerPhoneNumber("phone-1", "123456", "oauth-token"), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "PHONE_REGISTRATION_FAILED" &&
      "message" in error && !String(error.message).includes("123456")
  );
});

test("verifies that the configured Meta app is subscribed to the WABA", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    assert.equal(String(url), "https://graph.facebook.com/v26.0/123/subscribed_apps");
    assert.equal(init?.method, undefined);
    return jsonResponse({ data: [
      { whatsapp_business_api_data: { id: "another-app" } },
      { whatsapp_business_api_data: { id: "app" } },
    ] });
  });
  assert.equal(await client.isAppSubscribed("123", "app", "oauth-token"), true);
  assert.equal(await client.isAppSubscribed("123", "missing-app", "oauth-token"), false);
});

test("rejects incomplete WABA subscription metadata", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () => jsonResponse({ success: true }));
  await assert.rejects(client.isAppSubscribed("123", "app", "oauth-token"), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "META_INVALID_RESPONSE"
  );
});

test("classifies Meta app-domain redirect errors as authentication failures", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () =>
    new Response(JSON.stringify({ error: { code: 191, type: "OAuthException" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  );
  await assert.rejects(
    client.exchangeEmbeddedSignupCode({ code: "short-lived-code" }),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "META_AUTH_FAILED"
  );
});

test("rejects a successful non-JSON Meta response without exposing its body", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () =>
    new Response("<!DOCTYPE html><title>Proxy error</title>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    })
  );
  await assert.rejects(
    client.exchangeEmbeddedSignupCode({ code: "short-lived-code" }),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "META_INVALID_RESPONSE" &&
      "message" in error &&
      !String(error.message).includes("Proxy error")
  );
});

test("classifies Meta redirect URI mismatch as an authentication failure", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () =>
    jsonResponse({ error: { code: 100, error_subcode: 36008 } }, { status: 400 })
  );
  await assert.rejects(
    client.exchangeEmbeddedSignupCode({ code: "short-lived-code" }),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "META_AUTH_FAILED"
  );
});

test("sanitizes provider authentication diagnostics", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async () =>
    jsonResponse({
      error: {
        message: "Invalid code=secret-code&access_token=EAAsecretvalue",
        code: 100,
        error_subcode: 36008,
        type: "OAuthException",
        fbtrace_id: "trace-id",
      },
    }, { status: 400 })
  );
  await assert.rejects(
    client.exchangeEmbeddedSignupCode({ code: "short-lived-code" }),
    (error: unknown) => {
      if (typeof error !== "object" || error === null || !("details" in error)) return false;
      const details = error.details as Record<string, unknown>;
      return details.providerType === "OAuthException" &&
        details.providerMessage === "Invalid code=[REDACTED]&access_token=[REDACTED]" &&
        details.traceId === "trace-id";
    }
  );
});

test("lists and creates WABA-scoped templates with verified field names", async () => {
  const seen: Array<{ url: string; body?: unknown }> = [];
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    seen.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (init?.method === "POST") return jsonResponse({ id: "template-created", status: "PENDING" }, { status: 200 });
    return jsonResponse({ data: [{ id: "template-1", name: "stockiva_invoice_v1_en_us", language: "en_US", category: "UTILITY", status: "REJECTED", rejected_reason: "Incorrect category" }] }, { status: 200 });
  });
  const context = { organizationId: "org", credentialRef: "ref", metaWabaId: "waba-1" };
  const listed = await client.listMessageTemplates(context);
  assert.equal(listed[0]?.rejectionReason, "Incorrect category");
  const created = await client.createMessageTemplate({ ...context, name: "stockiva_invoice_v1_en_us", language: "en_US", category: "UTILITY", components: [{ type: "BODY", text: "Hi {{1}}", example: { bodyText: [["Aarav"]] } }] });
  assert.equal(created.status, "PENDING");
  assert.match(seen[0]!.url, /waba-1\/message_templates/);
  assert.deepEqual((seen[1]!.body as { components: unknown[] }).components, [{ type: "BODY", text: "Hi {{1}}", example: { body_text: [["Aarav"]] } }]);
});
