import test from "node:test";
import assert from "node:assert/strict";
import { createFollowUpSchema, updateFollowUpSchema } from "./customerFollowUpSchemas.ts";

test("accepts a linked restock follow-up", () => {
  const result = createFollowUpSchema.safeParse({
    customerId: "11111111-1111-4111-8111-111111111111",
    storeId: "22222222-2222-4222-8222-222222222222",
    demandRequestId: "33333333-3333-4333-8333-333333333333",
    type: "RESTOCK",
    priority: "HIGH",
    title: "Black 3XL polo restock",
  });
  assert.equal(result.success, true);
});

test("rejects empty creation and impossible status updates", () => {
  assert.equal(createFollowUpSchema.safeParse({}).success, false);
  assert.equal(updateFollowUpSchema.safeParse({}).success, false);
  assert.equal(updateFollowUpSchema.safeParse({ status: "DONE" }).success, false);
});
