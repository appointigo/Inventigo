import test from "node:test";
import assert from "node:assert/strict";
import { chooseAnalyticsStoreId } from "../utils/analyticsStoreScope.ts";

test("fixed-store users cannot request another store", () => {
  assert.equal(chooseAnalyticsStoreId("store-a", null), "store-a");
  assert.equal(chooseAnalyticsStoreId("store-a", "store-a"), "store-a");
  assert.throws(() => chooseAnalyticsStoreId("store-a", "store-b"), /Store access denied/);
});

test("organization users must explicitly select a store", () => {
  assert.equal(chooseAnalyticsStoreId(null, "store-a"), "store-a");
  assert.throws(() => chooseAnalyticsStoreId(null, null), /store must be selected/i);
});
