import assert from "node:assert/strict";
import test from "node:test";
import { receivePurchaseOrderSchema } from "./purchaseContracts.ts";

const base = { confirmationId: "confirm-123", items: [{ purchaseOrderItemId: "line-1", receivedQuantity: 5, acceptedQuantity: 3, heldQuantity: 1, rejectedQuantity: 1, damagedQuantity: 1, defectReason: "Packaging damage" }] };

test("receipt contract keeps held, rejected and accepted quantities distinct", () => {
  assert.equal(receivePurchaseOrderSchema.safeParse(base).success, true);
});

test("receipt contract rejects physical quantity mismatch", () => {
  assert.equal(receivePurchaseOrderSchema.safeParse({ ...base, items: [{ ...base.items[0], heldQuantity: 0 }] }).success, false);
});

test("receipt contract allows split mappings for one provisional PO line", () => {
  const result = receivePurchaseOrderSchema.safeParse({ ...base, items: [
    { ...base.items[0], mappingKey: "blue-30", receivedQuantity: 2, acceptedQuantity: 2, heldQuantity: 0, rejectedQuantity: 0, damagedQuantity: 0, defectReason: undefined },
    { ...base.items[0], mappingKey: "black-32", receivedQuantity: 3, acceptedQuantity: 2, heldQuantity: 1, rejectedQuantity: 0, damagedQuantity: 1 },
  ] });
  assert.equal(result.success, true);
});
