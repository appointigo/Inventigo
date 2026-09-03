import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppError } from "../errors.ts";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";

test("mock transport records domain-level requests", async () => {
  const client = new MockMetaWhatsAppClient();
  const result = await client.sendMessage({
    organizationId: "org-1",
    credentialRef: "credential-reference",
    metaPhoneNumberId: "phone-number-reference",
    recipient: "919999999999",
    content: { type: "TEXT", text: "Hello" },
  });

  assert.equal(client.requests.length, 1);
  assert.equal(client.requests[0].content.type, "TEXT");
  assert.equal(result.providerMessageId, "mock-message-id");
});

test("typed errors preserve code and retryability", () => {
  const error = new WhatsAppError("META_RATE_LIMITED", "Rate limited", { retryable: true });
  assert.equal(error.code, "META_RATE_LIMITED");
  assert.equal(error.retryable, true);
});
