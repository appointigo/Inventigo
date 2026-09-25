import test from "node:test";
import assert from "node:assert/strict";
import { paginateCustomerRows, shouldApplyCustomerSort } from "./customerPagination.ts";

const rows = Array.from({ length: 24 }, (_, index) => `customer-${index + 1}`);

test("page-number pagination returns distinct database-order slices", () => {
  assert.deepEqual(paginateCustomerRows(rows, 1, 10).items, rows.slice(0, 10));
  assert.deepEqual(paginateCustomerRows(rows, 2, 10).items, rows.slice(10, 20));
  assert.deepEqual(paginateCustomerRows(rows, 3, 10).items, rows.slice(20, 24));
  assert.equal(
    new Set([
      ...paginateCustomerRows(rows, 1, 10).items,
      ...paginateCustomerRows(rows, 2, 10).items,
    ]).size,
    20
  );
});

test("pagination metadata represents the complete filtered population", () => {
  assert.deepEqual(paginateCustomerRows(Array.from({ length: 184 }), 2, 10), {
    items: Array.from({ length: 10 }),
    total: 184,
    page: 2,
    pageSize: 10,
    totalPages: 19,
  });
});

test("page sizes and final pages are normalized", () => {
  assert.equal(paginateCustomerRows(rows, 1, 50).items.length, 24);
  assert.equal(paginateCustomerRows(rows, 1, 100).pageSize, 100);
  assert.equal(paginateCustomerRows(rows, 99, 10).page, 3);
  assert.equal(paginateCustomerRows(rows, 99, 10).items.length, 4);
});

test("Ant Table pagination does not reapply sorting and reset the current page", () => {
  assert.equal(shouldApplyCustomerSort("paginate"), false);
  assert.equal(shouldApplyCustomerSort("filter"), false);
  assert.equal(shouldApplyCustomerSort("sort"), true);
});
