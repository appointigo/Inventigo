import test from "node:test";
import assert from "node:assert/strict";
import { chooseFinanceStoreId, FinanceAccessError } from "./financeScope.ts";

test("fixed-store finance users are locked to their own store", () => {
  assert.equal(chooseFinanceStoreId("store-a", null), "store-a");
  assert.equal(chooseFinanceStoreId("store-a", "store-a"), "store-a");
  assert.throws(
    () => chooseFinanceStoreId("store-a", "store-b"),
    (error) => error instanceof FinanceAccessError && error.status === 403,
  );
});

test("organization users can select a store or retain organization scope", () => {
  assert.equal(chooseFinanceStoreId(null, null), null);
  assert.equal(chooseFinanceStoreId(null, "store-a"), "store-a");
});
