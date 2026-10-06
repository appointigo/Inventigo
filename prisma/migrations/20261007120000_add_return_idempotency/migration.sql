-- Prospective retry protection for return/exchange creation. Existing rows keep
-- NULL because historical client request identifiers cannot be reconstructed.
ALTER TABLE "return_transactions" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "return_transactions_idempotencyKey_key"
ON "return_transactions"("idempotencyKey");
