import test from "node:test";
import assert from "node:assert/strict";
import { customerDetailQueryKey, customerDirectoryQueryKey } from "./customerQueries.ts";

const base = {
  storeId: "store-1",
  search: "",
  type: "attention" as const,
  page: 1,
  pageSize: 10,
  sortBy: "lastPurchase" as const,
  sortDirection: "desc" as const,
};

test("date presets and KPI group are part of the directory query key", () => {
  const thirty = customerDirectoryQueryKey({ ...base, filters: { lastPurchaseDays: 30 } });
  const ninety = customerDirectoryQueryKey({ ...base, filters: { lastPurchaseDays: 90 } });
  assert.notDeepEqual(thirty, ninety);
  assert.equal(thirty[2].type, "attention");
  assert.equal(thirty[2].filters.lastPurchaseDays, 30);
});

test("pagination changes cannot reuse a stale page key", () => {
  assert.notDeepEqual(
    customerDirectoryQueryKey({ ...base, page: 1, filters: {} }),
    customerDirectoryQueryKey({ ...base, page: 2, filters: {} })
  );
});

test("scope, search, size, sorting and filters all participate in the query key", () => {
  const original = customerDirectoryQueryKey({ ...base, filters: { minSpend: 100 } });
  for (const changed of [
    { ...base, storeId: "store-2", filters: { minSpend: 100 } },
    { ...base, search: "asha", filters: { minSpend: 100 } },
    { ...base, pageSize: 50, filters: { minSpend: 100 } },
    { ...base, sortBy: "name" as const, filters: { minSpend: 100 } },
    { ...base, filters: { minSpend: 200 } },
  ])
    assert.notDeepEqual(original, customerDirectoryQueryKey(changed));
});

test("customer detail requests are keyed independently for rapid switching", () => {
  assert.notDeepEqual(customerDetailQueryKey("customer-a"), customerDetailQueryKey("customer-c"));
});
