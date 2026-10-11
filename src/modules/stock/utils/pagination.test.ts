import assert from "node:assert/strict";
import test from "node:test";
import { normalizeInventoryPagination, validInventoryPage } from "./pagination.ts";

test("normalizes inventory API page inputs", () => {
  assert.deepEqual(normalizeInventoryPagination("2", "50"), { page: 2, pageSize: 50 });
  assert.deepEqual(normalizeInventoryPagination("0", "500"), { page: 1, pageSize: 100 });
  assert.deepEqual(normalizeInventoryPagination("invalid", undefined), { page: 1, pageSize: 20 });
});

test("adjusts the current page when a page-size change makes it invalid", () => {
  assert.equal(validInventoryPage(85, 9, 10), 9);
  assert.equal(validInventoryPage(85, 9, 20), 5);
  assert.equal(validInventoryPage(85, 5, 50), 2);
  assert.equal(validInventoryPage(12, 2, 20), 1);
  assert.equal(validInventoryPage(0, 4, 100), 1);
});
