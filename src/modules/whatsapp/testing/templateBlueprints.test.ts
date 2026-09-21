import assert from "node:assert/strict";
import test from "node:test";
import {
  invoiceV1Blueprint,
  merchantMarketingBlueprints,
  stockivaTemplateBlueprints,
} from "../templates/blueprints.ts";

test("keeps invoice v1 as the only automatically reconciled system blueprint", () => {
  assert.equal(invoiceV1Blueprint.namePattern, "stockiva_invoice_v1_en_us");
  assert.equal(invoiceV1Blueprint.category, "UTILITY");
  assert.equal(invoiceV1Blueprint.purpose, "INVOICE");
  assert.equal(invoiceV1Blueprint.language, "en_US");
  assert.deepEqual(
    stockivaTemplateBlueprints
      .filter(blueprint => blueprint.creationPolicy === "AUTO_RECONCILE")
      .map(blueprint => blueprint.id),
    [invoiceV1Blueprint.id]
  );
});

test("offers five merchant-selected marketing blueprints without auto reconciliation", () => {
  assert.deepEqual(
    merchantMarketingBlueprints.map(blueprint => blueprint.id),
    [
      "festival_offer_v1",
      "percentage_discount_v1",
      "new_arrival_v1",
      "back_in_stock_v1",
      "store_announcement_v1",
    ]
  );
  assert.ok(merchantMarketingBlueprints.every(blueprint => blueprint.category === "MARKETING"));
  assert.ok(
    merchantMarketingBlueprints.every(
      blueprint => blueprint.creationPolicy === "MERCHANT_SELECTED"
    )
  );
  assert.equal(new Set(stockivaTemplateBlueprints.map(blueprint => blueprint.id)).size, 6);
});
