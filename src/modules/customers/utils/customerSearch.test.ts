import assert from "node:assert/strict";
import test from "node:test";
import { phoneSearchDigits } from "./customerSearch.ts";

test("normalizes phone-like customer searches", () => {
  assert.equal(phoneSearchDigits(" +91 (999) 000-0702 "), "919990000702");
  assert.equal(phoneSearchDigits("000-070"), "000070");
});

test("does not turn names containing digits into phone searches", () => {
  assert.equal(phoneSearchDigits("E2E Updated"), null);
  assert.equal(phoneSearchDigits("Shop 24"), null);
  assert.equal(phoneSearchDigits("+"), null);
});
