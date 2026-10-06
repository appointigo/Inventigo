import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTransferRecommendations,
  reconcileTransfer,
  canPerformTransferAction,
  validateLiveTransfer,
  dispatchAccounting,
  receiptAccounting,
  type StoreVariantPosition,
} from "./transferPolicy.ts";

const position = (overrides: Partial<StoreVariantPosition>): StoreVariantPosition => ({
  storeId: "destination",
  storeName: "Destination",
  productId: "p",
  sizeId: "s",
  product: "Shirt",
  sku: "SHIRT",
  variant: "M",
  action: "REORDER",
  currentStock: 5,
  recommendedQuantity: 15,
  evidenceQuality: "HIGH",
  targetStock: 20,
  reorderPoint: 10,
  usefulInbound: 0,
  coverDays: 5,
  unfulfilledDemand: 0,
  unitCost: 100,
  ...overrides,
});

test("recommends the destination requirement when source excess is sufficient", () => {
  const result = buildTransferRecommendations([
    position({}),
    position({
      storeId: "source",
      storeName: "Source",
      currentStock: 50,
      targetStock: 20,
      reorderPoint: 20,
      action: "OVERSTOCK",
      coverDays: 100,
    }),
  ])[0];
  assert.equal(result.recommendedQuantity, 15);
  assert.equal(result.remainingSupplierRequirement, 0);
});

test("protects source stock and leaves a supplier remainder", () => {
  const result = buildTransferRecommendations([
    position({}),
    position({
      storeId: "source",
      currentStock: 28,
      targetStock: 20,
      reorderPoint: 20,
      action: "OVERSTOCK",
    }),
  ])[0];
  assert.equal(result.recommendedQuantity, 8);
  assert.equal(result.remainingSupplierRequirement, 7);
});

test("requires supplier reorder when no safe source exists", () => {
  const result = buildTransferRecommendations([
    position({}),
    position({ storeId: "source", currentStock: 20, targetStock: 20, action: "NO_REORDER" }),
  ])[0];
  assert.equal(result.type, "SUPPLIER_REORDER_REQUIRED");
});

test("timely inbound prevents a transfer candidate", () => {
  assert.equal(
    buildTransferRecommendations([position({ action: "INBOUND_COVERS_DEMAND" })]).length,
    0
  );
});

test("multiple sources rank evidence then post-transfer cover", () => {
  const result = buildTransferRecommendations([
    position({}),
    position({
      storeId: "low",
      storeName: "Low",
      currentStock: 80,
      targetStock: 20,
      action: "OVERSTOCK",
      evidenceQuality: "MEDIUM",
      coverDays: 160,
    }),
    position({
      storeId: "high",
      storeName: "High",
      currentStock: 50,
      targetStock: 20,
      action: "OVERSTOCK",
      evidenceQuality: "HIGH",
      coverDays: 100,
    }),
  ])[0];
  assert.equal(result.sourceStoreId, "high");
});

test("partial and final receipts reconcile without over-receipt", () => {
  assert.deepEqual(
    reconcileTransfer({
      dispatched: 20,
      previouslyReceived: 0,
      previouslyDamaged: 0,
      receiveNow: 18,
      damageNow: 0,
    }),
    { received: 18, damaged: 0, unresolved: 2, status: "PARTIALLY_RECEIVED" }
  );
  assert.deepEqual(
    reconcileTransfer({
      dispatched: 20,
      previouslyReceived: 18,
      previouslyDamaged: 0,
      receiveNow: 0,
      damageNow: 2,
    }),
    { received: 18, damaged: 2, unresolved: 0, status: "RECEIVED" }
  );
  assert.throws(() =>
    reconcileTransfer({
      dispatched: 20,
      previouslyReceived: 18,
      previouslyDamaged: 0,
      receiveNow: 3,
      damageNow: 0,
    })
  );
});

test("fixed-store users are limited to their dispatch or receiving side", () => {
  assert.equal(
    canPerformTransferAction({
      role: "STAFF",
      userStoreId: "a",
      sourceStoreId: "a",
      destinationStoreId: "b",
      action: "DISPATCH",
    }),
    true
  );
  assert.equal(
    canPerformTransferAction({
      role: "STAFF",
      userStoreId: "a",
      sourceStoreId: "a",
      destinationStoreId: "b",
      action: "RECEIVE",
    }),
    false
  );
  assert.equal(
    canPerformTransferAction({ role: "MANAGER", userStoreId: "a", action: "APPROVE" }),
    false
  );
  assert.equal(
    canPerformTransferAction({ role: "MANAGER", userStoreId: null, action: "APPROVE" }),
    true
  );
});

test("stale recommendations are blocked before approval or dispatch", () => {
  assert.throws(
    () =>
      validateLiveTransfer({
        quantity: 20,
        safelyAvailable: 10,
        destinationNeed: 20,
        recommendationBased: true,
      }),
    /only 10/
  );
  assert.throws(
    () =>
      validateLiveTransfer({
        quantity: 5,
        safelyAvailable: 10,
        destinationNeed: 0,
        recommendationBased: true,
      }),
    /no longer exists/
  );
});

test("dispatch reduces only source and creates in-transit evidence", () => {
  assert.deepEqual(dispatchAccounting(20), {
    sourceDelta: -20,
    destinationDelta: 0,
    inTransitDelta: 20,
  });
});

test("receipt increases destination only by received units and reconciles damage", () => {
  assert.deepEqual(receiptAccounting({ received: 18, damaged: 2 }), {
    destinationDelta: 18,
    inTransitDelta: -20,
  });
});
