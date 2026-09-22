CREATE INDEX IF NOT EXISTS "sales_storeId_transactionDate_idx"
ON "sales"("storeId", "transactionDate");

CREATE INDEX IF NOT EXISTS "return_transactions_storeId_businessDate_idx"
ON "return_transactions"("storeId", "businessDate");

CREATE INDEX IF NOT EXISTS "stock_movements_storeId_movementDate_idx"
ON "stock_movements"("storeId", "movementDate");

CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx"
ON "sale_items"("saleId");

CREATE INDEX IF NOT EXISTS "sale_items_productId_idx"
ON "sale_items"("productId");
