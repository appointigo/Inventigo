import assert from "node:assert/strict";
import test from "node:test";
import { HttpMetaWhatsAppClient } from "../clients/HttpMetaWhatsAppClient.ts";

const credentials = { save: async () => "ref", resolve: async () => "secret-token" };
const config = { appId: "app", appSecret: "secret", graphApiVersion: "v26.0", timeoutMs: 50 };
const request = { organizationId: "org", credentialRef: "ref", metaPhoneNumberId: "123", recipient: "919999999999", content: { type: "TEXT" as const, text: "Hello" } };

test("sends the verified Cloud API message shape without putting tokens in the URL", async () => {
  let seen: { url?: string; init?: RequestInit } = {};
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    seen = { url: String(url), init }; return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 });
  });
  assert.equal((await client.sendMessage(request)).providerMessageId, "wamid.1");
  assert.equal(seen.url, "https://graph.facebook.com/v26.0/123/messages");
  assert.equal((JSON.parse(String(seen.init?.body)) as { messaging_product: string }).messaging_product, "whatsapp");
  assert.ok(!seen.url.includes("secret-token"));
});

for (const [name, status, code, expected] of [["auth", 401, 190, "META_AUTH_FAILED"], ["rate limit", 429, 4, "META_RATE_LIMITED"], ["provider", 500, 2, "META_PROVIDER_FAILED"]] as const) {
  test(`normalizes ${name} errors`, async () => {
    const client = new HttpMetaWhatsAppClient(config, credentials, async () => new Response(JSON.stringify({ error: { message: "sensitive provider text", code } }), { status }));
    await assert.rejects(client.sendMessage(request), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === expected);
  });
}

test("normalizes timeouts", async () => {
  const client = new HttpMetaWhatsAppClient(config, credentials, async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
  await assert.rejects(client.sendMessage(request), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "META_TIMEOUT");
});

test("lists and creates WABA-scoped templates with verified field names", async () => {
  const seen: Array<{ url: string; body?: unknown }> = [];
  const client = new HttpMetaWhatsAppClient(config, credentials, async (url, init) => {
    seen.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (init?.method === "POST") return new Response(JSON.stringify({ id: "template-created", status: "PENDING" }), { status: 200 });
    return new Response(JSON.stringify({ data: [{ id: "template-1", name: "stockiva_invoice_v1_en_us", language: "en_US", category: "UTILITY", status: "REJECTED", rejected_reason: "Incorrect category" }] }), { status: 200 });
  });
  const context = { organizationId: "org", credentialRef: "ref", metaWabaId: "waba-1" };
  const listed = await client.listMessageTemplates(context);
  assert.equal(listed[0]?.rejectionReason, "Incorrect category");
  const created = await client.createMessageTemplate({ ...context, name: "stockiva_invoice_v1_en_us", language: "en_US", category: "UTILITY", components: [{ type: "BODY", text: "Hi {{1}}", example: { bodyText: [["Aarav"]] } }] });
  assert.equal(created.status, "PENDING");
  assert.match(seen[0]!.url, /waba-1\/message_templates/);
  assert.deepEqual((seen[1]!.body as { components: unknown[] }).components, [{ type: "BODY", text: "Hi {{1}}", example: { body_text: [["Aarav"]] } }]);
});
