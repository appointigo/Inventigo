-- Database invariants and partial indexes intentionally not expressible in
-- prisma/schema.prisma. Names and definitions come from the immutable
-- production migration history audited at the greenfield baseline boundary.

ALTER TABLE "whatsapp_template_definitions"
  ADD CONSTRAINT "whatsapp_template_definitions_scope_owner_check" CHECK (
    ("scope" = 'PLATFORM' AND "organizationId" IS NULL) OR
    ("scope" = 'ORGANIZATION' AND "organizationId" IS NOT NULL)
  );

ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_positive_quantity_check"
  CHECK ("totalQuantity" > 0);
ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_nonnegative_money_check"
  CHECK ("unitCost" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "purchase_item_options"
  ADD CONSTRAINT "purchase_item_options_positive_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_nonnegative_money_check"
  CHECK (
    "subtotal" >= 0 AND
    "additionalCharges" >= 0 AND
    "discountAmount" >= 0 AND
    "totalAmount" >= 0
  );

ALTER TABLE "stock_transfers"
  ADD CONSTRAINT "stock_transfers_distinct_stores"
  CHECK ("sourceStoreId" <> "destinationStoreId");
ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_positive_requested"
  CHECK ("requestedQuantity" > 0);
ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_nonnegative_quantities"
  CHECK (
    "approvedQuantity" >= 0 AND
    "dispatchedQuantity" >= 0 AND
    "receivedQuantity" >= 0 AND
    "damagedQuantity" >= 0
  );

CREATE UNIQUE INDEX "store_whatsapp_senders_active_default_key"
  ON "store_whatsapp_senders"("storeId", "purpose")
  WHERE "isDefault" = true AND "isActive" = true;
CREATE UNIQUE INDEX "whatsapp_template_definitions_platform_key"
  ON "whatsapp_template_definitions"("key", "version", "language")
  WHERE "scope" = 'PLATFORM';
CREATE UNIQUE INDEX "whatsapp_template_definitions_organization_key"
  ON "whatsapp_template_definitions"("organizationId", "key", "version", "language")
  WHERE "scope" = 'ORGANIZATION';
