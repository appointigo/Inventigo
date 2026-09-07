-- Nullable snapshots: preserve historical transactions without recalculation.
ALTER TABLE "sale_items"
  ADD COLUMN "originalUnitPrice" DECIMAL(10,2),
  ADD COLUMN "itemDiscountType" TEXT,
  ADD COLUMN "itemDiscountValue" DECIMAL(10,2),
  ADD COLUMN "netLineAmount" DECIMAL(10,2);

-- Preserve paise when the paid line cannot be divided evenly by quantity.
ALTER TABLE "return_transaction_items" ADD COLUMN "returnedLineAmount" DECIMAL(10,2);
