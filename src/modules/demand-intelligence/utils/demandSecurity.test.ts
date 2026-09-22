import test from "node:test";
import assert from "node:assert/strict";
import { assertReferencesResolved, assertStoreAssignment } from "./demandSecurity.ts";

test("rejects a store-bound user selecting another store", () => {
  assert.doesNotThrow(() => assertStoreAssignment("store-a", "store-a"));
  assert.throws(() => assertStoreAssignment("store-a", "store-b"), /Store access denied/);
  assert.doesNotThrow(() => assertStoreAssignment(null, "store-b"));
});

test("rejects unresolved foreign entity identifiers", () => {
  assert.doesNotThrow(() => assertReferencesResolved(["a", "b"], ["a", "b"], "Category"));
  assert.throws(
    () => assertReferencesResolved(["foreign"], [], "Product"),
    /Product access denied/
  );
});
