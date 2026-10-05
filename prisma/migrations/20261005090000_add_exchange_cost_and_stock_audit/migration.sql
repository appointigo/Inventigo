ALTER TABLE "return_transaction_items"
  ADD COLUMN "newCostPrice" DECIMAL(10, 2);

ALTER TABLE "stock_movements"
  ADD COLUMN "deltaQuantity" INTEGER,
  ADD COLUMN "quantityBefore" INTEGER,
  ADD COLUMN "quantityAfter" INTEGER;

COMMENT ON COLUMN "return_transaction_items"."newCostPrice" IS
  'Immutable unit cost captured when an exchange replacement is issued. NULL on legacy rows remains unknown.';

COMMENT ON COLUMN "stock_movements"."quantity" IS
  'Legacy-compatible absolute movement magnitude.';

COMMENT ON COLUMN "stock_movements"."deltaQuantity" IS
  'Signed stock change for auditable movements. NULL means historical direction is not reliably known.';
