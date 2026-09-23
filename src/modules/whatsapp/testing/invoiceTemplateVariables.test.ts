import assert from "node:assert/strict";
import test from "node:test";
import {
  extractBodyVariableKeys,
  hasSupportedInvoiceVariableMapping,
  resolveInvoiceTemplateVariables,
} from "../services/invoiceTemplateVariables.ts";

test("extracts and resolves the approved invoice_delivery named variables", () => {
  const body = "Hello {{customer_name}}, invoice {{order_id}} dated {{order_date}} is attached.";
  const keys = extractBodyVariableKeys(body);
  assert.deepEqual(keys, ["customer_name", "order_id", "order_date"]);
  assert.equal(hasSupportedInvoiceVariableMapping(body), true);
  const variables = resolveInvoiceTemplateVariables(keys, {
    customerName: "Test Customer",
    reference: "INV-TEST-001",
    storeName: "Test Store",
    amount: 1250,
    transactionDate: "2026-09-24T08:30:00.000Z",
  });
  assert.equal(variables.customer_name, "Test Customer");
  assert.equal(variables.order_id, "INV-TEST-001");
  assert.match(variables.order_date, /24 Sept 2026/);
});

test("keeps existing positional invoice variables compatible", () => {
  const body = "Hi {{1}}, invoice {{2}} from {{3}} for {{4}} is ready.";
  const keys = extractBodyVariableKeys(body);
  assert.deepEqual(keys, ["1", "2", "3", "4"]);
  assert.equal(hasSupportedInvoiceVariableMapping(body), true);
  const variables = resolveInvoiceTemplateVariables(keys, {
    customerName: "Test Customer",
    reference: "INV-TEST-002",
    storeName: "Test Store",
    amount: 799,
    transactionDate: "2026-09-24T08:30:00.000Z",
  });
  assert.equal(variables["1"], "Test Customer");
  assert.equal(variables["2"], "INV-TEST-002");
  assert.equal(variables["3"], "Test Store");
  assert.match(variables["4"], /799/);
});

test("rejects mixed or unknown template variable mappings", () => {
  assert.equal(hasSupportedInvoiceVariableMapping("Hi {{1}} {{customer_name}}"), false);
  assert.equal(hasSupportedInvoiceVariableMapping("Hi {{unknown_value}}"), false);
  assert.throws(() => resolveInvoiceTemplateVariables(["unknown_value"], {
    customerName: "Test Customer",
    reference: "INV-TEST-003",
    storeName: "Test Store",
    amount: 1,
    transactionDate: "2026-09-24T08:30:00.000Z",
  }), /INVOICE_TEMPLATE_VARIABLES_UNSUPPORTED/);
});
