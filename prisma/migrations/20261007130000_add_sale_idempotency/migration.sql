-- Sale retries must resolve to one committed business transaction per store.
-- Nullable columns keep existing sales valid while new API writes carry the
-- idempotency identity and the canonical request hash atomically with the sale.
ALTER TABLE "sales"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyPayloadHash" TEXT;

CREATE UNIQUE INDEX "sales_storeId_idempotencyKey_key"
ON "sales"("storeId", "idempotencyKey");
