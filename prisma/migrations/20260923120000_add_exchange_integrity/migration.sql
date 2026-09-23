-- Add the exchange movement/reference values required by the current schema.
-- IF NOT EXISTS keeps this forward migration safe for databases where a value
-- may already have been introduced manually.
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'EXCHANGE_IN';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'EXCHANGE_OUT';
ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'EXCHANGE';

-- The configured-database integrity audit found no orphaned values in these columns.
-- Preserve optional item references when a product or size is removed.
ALTER TABLE "return_transaction_items"
  ADD CONSTRAINT "return_transaction_items_returnedProductId_fkey"
  FOREIGN KEY ("returnedProductId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_transaction_items"
  ADD CONSTRAINT "return_transaction_items_returnedSizeId_fkey"
  FOREIGN KEY ("returnedSizeId") REFERENCES "sizes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_transaction_items"
  ADD CONSTRAINT "return_transaction_items_newProductId_fkey"
  FOREIGN KEY ("newProductId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_transaction_items"
  ADD CONSTRAINT "return_transaction_items_newSizeId_fkey"
  FOREIGN KEY ("newSizeId") REFERENCES "sizes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
