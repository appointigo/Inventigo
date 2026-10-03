import test from "node:test";
import assert from "node:assert/strict";
import {
  customerVisitInputSchema,
  customerVisitPatchSchema,
  demandRequestInputSchema,
} from "./demandValidation.ts";

const categoryId = "00000000-0000-4000-8000-000000000001";

test("accepts category-only and generic attribute demand", () => {
  assert.equal(
    demandRequestInputSchema.safeParse({
      categoryId,
      requestedQuantity: 1,
      fulfilledQuantity: 0,
      status: "UNFULFILLED",
      reasonCode: "OUT_OF_STOCK",
    }).success,
    true
  );
  assert.equal(
    demandRequestInputSchema.safeParse({
      categoryId,
      requestedQuantity: 2,
      fulfilledQuantity: 1,
      status: "PARTIALLY_FULFILLED",
      reasonCode: "VARIANT_UNAVAILABLE",
      attributes: { storage: "256GB", color: "Black" },
    }).success,
    true
  );
});

test("accepts an anonymous May Return visit with an optional rough return period", () => {
  assert.equal(
    customerVisitInputSchema.safeParse({
      storeId: "00000000-0000-4000-8000-000000000002",
      outcome: "MAY_RETURN",
      expectedReturnPeriod: "TWO_TO_THREE_DAYS",
      requests: [],
    }).success,
    true
  );
  assert.equal(
    customerVisitPatchSchema.safeParse({
      returnConfirmedAt: new Date().toISOString(),
      returnOutcome: "PURCHASED",
    }).success,
    true
  );
  assert.equal(
    customerVisitPatchSchema.safeParse({
      returnConfirmedAt: new Date().toISOString(),
      returnOutcome: "DID_NOT_PURCHASE",
    }).success,
    true
  );
  const createResult = customerVisitInputSchema.safeParse({
    storeId: "00000000-0000-4000-8000-000000000002",
    outcome: "MAY_RETURN",
    returnConfirmedAt: new Date().toISOString(),
    requests: [],
  });
  assert.equal(createResult.success, true);
  if (createResult.success) assert.equal("returnConfirmedAt" in createResult.data, false);
  assert.equal(
    customerVisitInputSchema.safeParse({
      storeId: "00000000-0000-4000-8000-000000000002",
      outcome: "CONVERTED",
      expectedReturnPeriod: "TOMORROW",
      requests: [],
    }).success,
    false
  );
});

test("rejects impossible quantities and uncategorized stock demand", () => {
  assert.equal(
    demandRequestInputSchema.safeParse({
      requestedQuantity: 1,
      fulfilledQuantity: 2,
      status: "PARTIALLY_FULFILLED",
      reasonCode: "OUT_OF_STOCK",
    }).success,
    false
  );
  assert.equal(
    demandRequestInputSchema.safeParse({
      requestedQuantity: 1,
      fulfilledQuantity: 0,
      status: "UNFULFILLED",
      reasonCode: "PRODUCT_UNAVAILABLE",
    }).success,
    false
  );
  assert.equal(
    demandRequestInputSchema.safeParse({
      categoryId,
      requestedQuantity: 2,
      fulfilledQuantity: 0,
      status: "PARTIALLY_FULFILLED",
      reasonCode: "VARIANT_UNAVAILABLE",
    }).success,
    false
  );
});

test("accepts fast browsing visits and multiple requests", () => {
  const result = customerVisitInputSchema.safeParse({
    storeId: "00000000-0000-4000-8000-000000000002",
    outcome: "BROWSING",
    requests: [
      {
        requestedQuantity: 1,
        fulfilledQuantity: 0,
        status: "ABANDONED",
        reasonCode: "JUST_BROWSING",
      },
    ],
  });
  assert.equal(result.success, true);
  assert.equal(
    customerVisitInputSchema.safeParse({
      storeId: "00000000-0000-4000-8000-000000000002",
      outcome: "PARTIALLY_CONVERTED",
      requests: [],
    }).success,
    false
  );
});
