import test from "node:test";
import assert from "node:assert/strict";
import { resolveStockDelta, stockAuditSnapshot } from "./stockMovementContract.ts";

test("set-quantity adjustments preserve signed direction", () => {
  assert.equal(
    resolveStockDelta({ type: "ADJUSTMENT", operation: "SET", quantityBefore: 10, quantity: 15 }),
    5
  );
  assert.equal(
    resolveStockDelta({ type: "ADJUSTMENT", operation: "SET", quantityBefore: 15, quantity: 12 }),
    -3
  );
  assert.equal(
    resolveStockDelta({ type: "ADJUSTMENT", operation: "SET", quantityBefore: 12, quantity: 12 }),
    0
  );
});

test("movement types and manual operations resolve canonical deltas", () => {
  assert.equal(resolveStockDelta({ type: "SALE", quantityBefore: 10, quantity: 2 }), -2);
  assert.equal(resolveStockDelta({ type: "RETURN", quantityBefore: 8, quantity: 1 }), 1);
  assert.equal(resolveStockDelta({ type: "IN", quantityBefore: 9, quantity: 10 }), 10);
  assert.equal(
    resolveStockDelta({ type: "ADJUSTMENT", operation: "ADD", quantityBefore: 19, quantity: 3 }),
    3
  );
  assert.equal(
    resolveStockDelta({ type: "ADJUSTMENT", operation: "REMOVE", quantityBefore: 22, quantity: 4 }),
    -4
  );
  assert.equal(resolveStockDelta({ type: "TRANSFER_OUT", quantityBefore: 22, quantity: 4 }), -4);
  assert.equal(resolveStockDelta({ type: "TRANSFER_IN", quantityBefore: 8, quantity: 4 }), 4);
});

test("before plus delta always equals after and negative results are rejected", () => {
  assert.deepEqual(stockAuditSnapshot(15, -3), {
    quantity: 3,
    deltaQuantity: -3,
    quantityBefore: 15,
    quantityAfter: 12,
  });
  assert.throws(() => stockAuditSnapshot(2, -3), /Insufficient stock/);
});
