import test from "node:test";
import assert from "node:assert/strict";
import { getCustomerNavigationTargets } from "./customerNavigation.ts";

test("navigates in current filtered page order", () => {
  assert.deepEqual(
    getCustomerNavigationTargets({
      selectedCustomerId: "b",
      itemIds: ["a", "b", "c"],
      page: 2,
      pageSize: 3,
      total: 9,
    }),
    {
      previous: { page: 2, index: 0 },
      next: { page: 2, index: 2 },
    }
  );
});

test("crosses pagination boundaries", () => {
  assert.deepEqual(
    getCustomerNavigationTargets({
      selectedCustomerId: "c",
      itemIds: ["a", "b", "c"],
      page: 1,
      pageSize: 3,
      total: 7,
    }).next,
    { page: 2, index: 0 }
  );
  assert.deepEqual(
    getCustomerNavigationTargets({
      selectedCustomerId: "d",
      itemIds: ["d", "e", "f"],
      page: 2,
      pageSize: 3,
      total: 7,
    }).previous,
    { page: 1, index: 2 }
  );
});

test("disables controls at the result-set boundaries", () => {
  assert.equal(
    getCustomerNavigationTargets({
      selectedCustomerId: "a",
      itemIds: ["a", "b"],
      page: 1,
      pageSize: 2,
      total: 2,
    }).previous,
    null
  );
  assert.equal(
    getCustomerNavigationTargets({
      selectedCustomerId: "b",
      itemIds: ["a", "b"],
      page: 1,
      pageSize: 2,
      total: 2,
    }).next,
    null
  );
});

test("does not navigate when selection is outside current filtered page", () => {
  assert.deepEqual(
    getCustomerNavigationTargets({
      selectedCustomerId: "x",
      itemIds: ["a", "b"],
      page: 1,
      pageSize: 2,
      total: 5,
    }),
    { previous: null, next: null }
  );
});
