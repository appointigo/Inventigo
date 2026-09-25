import test from "node:test";
import assert from "node:assert/strict";
import { canAccessCustomerInvoice } from "./customerInvoiceAccess.ts";

test("allows only invoices belonging to the route customer", () => {
  assert.equal(
    canAccessCustomerInvoice({
      customerId: "customer-a",
      saleCustomerId: "customer-a",
      saleStoreId: "store-a",
    }),
    true
  );
  assert.equal(
    canAccessCustomerInvoice({
      customerId: "customer-a",
      saleCustomerId: "customer-b",
      saleStoreId: "store-a",
    }),
    false
  );
  assert.equal(
    canAccessCustomerInvoice({
      customerId: "customer-a",
      saleCustomerId: null,
      saleStoreId: "store-a",
    }),
    false
  );
});

test("enforces an authenticated user's store scope", () => {
  assert.equal(
    canAccessCustomerInvoice({
      customerId: "customer-a",
      saleCustomerId: "customer-a",
      saleStoreId: "store-a",
      authorizedStoreId: "store-a",
    }),
    true
  );
  assert.equal(
    canAccessCustomerInvoice({
      customerId: "customer-a",
      saleCustomerId: "customer-a",
      saleStoreId: "store-b",
      authorizedStoreId: "store-a",
    }),
    false
  );
});
