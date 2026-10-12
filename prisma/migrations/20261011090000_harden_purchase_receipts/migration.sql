-- Durable request identity makes receipt confirmation safe to retry. Existing
-- receipt ids are valid unique identities for historical rows.
ALTER TABLE "purchase_order_receipts"
ADD COLUMN "confirmationId" TEXT;

UPDATE "purchase_order_receipts"
SET "confirmationId" = "id"
WHERE "confirmationId" IS NULL;

ALTER TABLE "purchase_order_receipts"
ALTER COLUMN "confirmationId" SET NOT NULL;

CREATE UNIQUE INDEX "purchase_order_receipts_confirmationId_key"
ON "purchase_order_receipts"("confirmationId");

-- A short-closed order preserves posted receipt and stock evidence while
-- explicitly removing the unfulfilled remainder from inbound commitments.
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "purchase_orders"
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "closedBy" TEXT,
ADD COLUMN "closureReason" TEXT;

CREATE INDEX "purchase_orders_closedBy_idx" ON "purchase_orders"("closedBy");

ALTER TABLE "purchase_orders"
ADD CONSTRAINT "purchase_orders_closedBy_fkey"
FOREIGN KEY ("closedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOT VALID preserves migration compatibility with historical data while
-- enforcing these invariants for all new or changed rows.
ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_quantity_positive"
CHECK ("quantity" > 0) NOT VALID,
ADD CONSTRAINT "purchase_order_items_unit_cost_nonnegative"
CHECK ("unitCost" >= 0) NOT VALID;

ALTER TABLE "purchase_order_receipt_items"
ADD CONSTRAINT "purchase_order_receipt_items_quantities_valid"
CHECK (
  "quantityReceived" > 0
  AND "quantityAccepted" >= 0
  AND "quantityRejected" >= 0
  AND "quantityDamaged" >= 0
  AND "quantityAccepted" + "quantityRejected" + "quantityDamaged" = "quantityReceived"
) NOT VALID,
ADD CONSTRAINT "purchase_order_receipt_items_actual_cost_nonnegative"
CHECK ("unitCostActual" IS NULL OR "unitCostActual" >= 0) NOT VALID;
