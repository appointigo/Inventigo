import assert from "node:assert/strict";
import test from "node:test";
import { parseEmbeddedSignupMessage } from "../embeddedSignupClient.ts";

test("accepts a Meta Embedded Signup completion event", () => {
  assert.deepEqual(parseEmbeddedSignupMessage("https://www.facebook.com", JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: { waba_id: "123", phone_number_id: "456" } })), { event: "FINISH", wabaId: "123", phoneNumberId: "456" });
});

test("rejects spoofed origins and unrelated messages", () => {
  assert.equal(parseEmbeddedSignupMessage("https://facebook.com.evil.test", JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH" })), null);
  assert.equal(parseEmbeddedSignupMessage("https://www.facebook.com", "not-json"), null);
});
