import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmbeddedSignupState,
  createEmbeddedSignupStateCookie,
  verifyEmbeddedSignupState,
} from "../security/embeddedSignupState.ts";

test("Embedded Signup state is bound to both the initiating user and organization", () => {
  const state = createEmbeddedSignupState();
  const cookie = createEmbeddedSignupStateCookie(state, "user-a", "org-a");
  assert.equal(verifyEmbeddedSignupState(cookie, state, "user-a", "org-a"), true);
  assert.equal(verifyEmbeddedSignupState(cookie, state, "user-a", "org-b"), false);
  assert.equal(verifyEmbeddedSignupState(cookie, state, "user-b", "org-a"), false);
  assert.equal(verifyEmbeddedSignupState(cookie, `${state}x`, "user-a", "org-a"), false);
  assert.equal(verifyEmbeddedSignupState("invalid", state, "user-a", "org-a"), false);
});
