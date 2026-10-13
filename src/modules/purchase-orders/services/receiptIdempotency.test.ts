import assert from "node:assert/strict";
import test from "node:test";
import { receiptPayloadHash } from "./receiptIdempotency.ts";

test("receipt payload hash is stable across object key and item ordering", () => {
  const left = receiptPayloadHash("po-1", { confirmationId: "confirm-1", items: [
    { purchaseOrderItemId: "b", acceptedQuantity: 2 },
    { acceptedQuantity: 1, purchaseOrderItemId: "a" },
  ] });
  const right = receiptPayloadHash("po-1", { items: [
    { purchaseOrderItemId: "a", acceptedQuantity: 1 },
    { acceptedQuantity: 2, purchaseOrderItemId: "b" },
  ], confirmationId: "confirm-1" });
  assert.equal(left, right);
});

test("same confirmation context with changed receipt values produces a different hash", () => {
  const original = receiptPayloadHash("po-1", { items: [{ purchaseOrderItemId: "a", acceptedQuantity: 1 }] });
  const changed = receiptPayloadHash("po-1", { items: [{ purchaseOrderItemId: "a", acceptedQuantity: 2 }] });
  assert.notEqual(original, changed);
});

test("the purchase order identity is part of the receipt fingerprint", () => {
  const payload = { items: [{ purchaseOrderItemId: "a", acceptedQuantity: 1 }] };
  assert.notEqual(receiptPayloadHash("po-1", payload), receiptPayloadHash("po-2", payload));
});
