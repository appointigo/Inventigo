import test from "node:test";
import assert from "node:assert/strict";
import { chooseForecastStoreId } from "./forecastScope.ts";

test("fixed-store forecasting cannot cross stores", () => {
  assert.equal(chooseForecastStoreId("a", null), "a");
  assert.throws(() => chooseForecastStoreId("a", "b"), /denied/);
});

test("organization forecasting requires an explicit store", () => {
  assert.equal(chooseForecastStoreId(null, "a"), "a");
  assert.throws(() => chooseForecastStoreId(null, null), /must be selected/);
});
