import assert from "node:assert/strict";
import test from "node:test";
import { requiresSubscriptionActivation } from "./navigationPolicy.ts";

test("new unpaid workspaces return to plan selection; paid and legacy workspaces do not", () => {
  assert.equal(requiresSubscriptionActivation(true, "NONE"), true);
  assert.equal(requiresSubscriptionActivation(true, "PAID"), false);
  assert.equal(requiresSubscriptionActivation(true, "SPONSORED"), false);
  assert.equal(requiresSubscriptionActivation(false, "NONE"), false);
});
