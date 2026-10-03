import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalAttributes,
  classifyDemandPressure,
  demandEvidenceLevel,
  demandFulfillmentRate,
  NON_STOCK_DEMAND_REASONS,
  summarizeObservedDemand,
  summarizeVisitOutcomes,
} from "./demandAnalytics.ts";

test("calculates observed-demand fulfilment and handles zero demand", () => {
  assert.equal(demandFulfillmentRate(12, 20), 60);
  assert.equal(demandFulfillmentRate(0, 0), null);
});

test("classifies known May Return results without double-counting pending or legacy unknown visits", () => {
  assert.deepEqual(
    summarizeVisitOutcomes([
      {
        outcome: "CONVERTED",
        returnConfirmedAt: null,
        returnOutcome: null,
        linkedSaleId: null,
      },
      {
        outcome: "NOT_CONVERTED",
        returnConfirmedAt: null,
        returnOutcome: null,
        linkedSaleId: null,
      },
      {
        outcome: "MAY_RETURN",
        returnConfirmedAt: null,
        returnOutcome: null,
        linkedSaleId: null,
      },
      {
        outcome: "MAY_RETURN",
        returnConfirmedAt: "2026-10-03T08:00:00.000Z",
        returnOutcome: "PURCHASED",
        linkedSaleId: null,
      },
      {
        outcome: "MAY_RETURN",
        returnConfirmedAt: "2026-10-03T09:00:00.000Z",
        returnOutcome: "DID_NOT_PURCHASE",
        linkedSaleId: null,
      },
      {
        outcome: "MAY_RETURN",
        returnConfirmedAt: "2026-10-03T10:00:00.000Z",
        returnOutcome: null,
        linkedSaleId: null,
      },
      {
        outcome: "MAY_RETURN",
        returnConfirmedAt: "2026-10-03T11:00:00.000Z",
        returnOutcome: null,
        linkedSaleId: "sale-1",
      },
    ]),
    {
      total: 7,
      converted: 3,
      partiallyConverted: 0,
      nonConverted: 2,
      browsing: 0,
      mayReturn: 5,
      confirmedReturned: 4,
      returnedAndPurchased: 2,
      returnedWithoutPurchase: 1,
      returnNotConfirmed: 1,
      conversionRate: 60,
    }
  );
});

test("a returned non-purchase leaves the converted count unchanged and only expands eligibility", () => {
  const before = summarizeVisitOutcomes([
    {
      outcome: "CONVERTED",
      returnConfirmedAt: null,
      returnOutcome: null,
      linkedSaleId: null,
    },
    {
      outcome: "MAY_RETURN",
      returnConfirmedAt: null,
      returnOutcome: null,
      linkedSaleId: null,
    },
  ]);
  const after = summarizeVisitOutcomes([
    {
      outcome: "CONVERTED",
      returnConfirmedAt: null,
      returnOutcome: null,
      linkedSaleId: null,
    },
    {
      outcome: "MAY_RETURN",
      returnConfirmedAt: "2026-10-04T08:00:00.000Z",
      returnOutcome: "DID_NOT_PURCHASE",
      linkedSaleId: null,
    },
  ]);

  assert.equal(before.converted, 1);
  assert.equal(after.converted, 1);
  assert.equal(before.conversionRate, 100);
  assert.equal(after.conversionRate, 50);
});

test("uses centralized sample-size awareness", () => {
  assert.equal(demandEvidenceLevel(0), "none");
  assert.equal(demandEvidenceLevel(3), "early");
  assert.equal(demandEvidenceLevel(10), "reliable");
});

test("classifies demand pressure transparently", () => {
  assert.equal(
    classifyDemandPressure({ observed: 20, unfulfilled: 12, currentStock: 0, requestCount: 12 }),
    "Critical Demand Gap"
  );
  assert.equal(
    classifyDemandPressure({ observed: 7, unfulfilled: 2, currentStock: 1, requestCount: 10 }),
    "Replenishment Needed"
  );
  assert.equal(
    classifyDemandPressure({ observed: 2, unfulfilled: 0, currentStock: 30, requestCount: 10 }),
    "Overstock Risk"
  );
  assert.equal(
    classifyDemandPressure({ observed: 9, unfulfilled: 8, currentStock: 0, requestCount: 3 }),
    "Early signal"
  );
});

test("excludes browsing and changed-mind outcomes from stock demand", () => {
  assert.equal(NON_STOCK_DEMAND_REASONS.has("JUST_BROWSING"), true);
  assert.equal(NON_STOCK_DEMAND_REASONS.has("CUSTOMER_CHANGED_MIND"), true);
  assert.equal(NON_STOCK_DEMAND_REASONS.has("OUT_OF_STOCK"), false);
});

test("canonicalizes generic attributes without business-specific fields", () => {
  assert.deepEqual(canonicalAttributes({ storage: "256GB", color: "Black" }), [
    "color:Black",
    "storage:256GB",
  ]);
});

test("aggregates fulfilled, partial, unfulfilled, and excluded requests", () => {
  assert.deepEqual(
    summarizeObservedDemand([
      { reasonCode: "OUT_OF_STOCK", requestedQuantity: 2, fulfilledQuantity: 0 },
      { reasonCode: "VARIANT_UNAVAILABLE", requestedQuantity: 3, fulfilledQuantity: 1 },
      { reasonCode: "FEATURE_UNAVAILABLE", requestedQuantity: 2, fulfilledQuantity: 2 },
      { reasonCode: "JUST_BROWSING", requestedQuantity: 1, fulfilledQuantity: 0 },
    ]),
    {
      requestCount: 3,
      observedDemand: 7,
      fulfilledQuantity: 3,
      unfulfilledQuantity: 4,
      fulfillmentRate: 42.9,
    }
  );
});
