import test from "node:test";
import assert from "node:assert/strict";
import {
  customerProfileHref,
  parseCustomerDirectoryState,
  safeCustomerReturnPath,
  serializeCustomerDirectoryState,
} from "./customerDirectoryState.ts";

const state = {
  search: "Asha",
  type: "attention" as const,
  page: 3,
  pageSize: 25,
  sortBy: "spend" as const,
  sortDirection: "asc" as const,
  storeId: "store-1",
  filters: { lastPurchaseDays: 30 as const, minSpend: 1000, minOrders: 2 },
};

test("directory state round-trips through non-sensitive URL parameters", () => {
  const parsed = parseCustomerDirectoryState(serializeCustomerDirectoryState(state));
  assert.deepEqual(parsed, {
    ...state,
    filters: { ...state.filters, maxSpend: undefined, maxOrders: undefined },
  });
});

test("profile links use the stable customer ID and preserve directory context", () => {
  const href = customerProfileHref("customer-id", state);
  assert.match(href, /^\/dashboard\/customers\/customer-id\?returnTo=/);
  assert.match(decodeURIComponent(href), /page=3/);
  assert.doesNotMatch(href, /mobile/);
});

test("return paths cannot escape the customer area", () => {
  assert.equal(safeCustomerReturnPath("https://example.com"), "/dashboard/customers");
  assert.equal(safeCustomerReturnPath("//example.com"), "/dashboard/customers");
  assert.equal(
    safeCustomerReturnPath("/dashboard/customers?page=2"),
    "/dashboard/customers?page=2"
  );
});
