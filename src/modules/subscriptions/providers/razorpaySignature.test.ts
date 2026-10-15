import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyRazorpaySignature } from "./razorpaySignature.ts";

test("webhook signature binds the exact raw body to the configured secret", () => {
  const raw = '{"event":"subscription.activated","id":"evt_1"}';
  const secret = "webhook-secret";
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifyRazorpaySignature(raw, signature, secret), true);
  assert.equal(verifyRazorpaySignature(`${raw} `, signature, secret), false);
  assert.equal(verifyRazorpaySignature(raw, signature, "other-secret"), false);
  assert.equal(verifyRazorpaySignature(raw, "not-hex", secret), false);
  assert.equal(verifyRazorpaySignature(raw, signature, undefined), false);
});
