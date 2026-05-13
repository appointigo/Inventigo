ALTER TABLE "sale_payments"
ADD COLUMN "businessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "return_transactions"
ADD COLUMN "businessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "stock_movements"
ADD COLUMN "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "sale_payments"
SET "businessDate" = "paidAt"
WHERE "businessDate" IS NOT NULL;

UPDATE "return_transactions"
SET "businessDate" = "createdAt"
WHERE "businessDate" IS NOT NULL;

UPDATE "stock_movements"
SET "movementDate" = "createdAt"
WHERE "movementDate" IS NOT NULL;

CREATE INDEX "sale_payments_businessDate_idx" ON "sale_payments"("businessDate");
CREATE INDEX "return_transactions_businessDate_idx" ON "return_transactions"("businessDate");
CREATE INDEX "stock_movements_movementDate_idx" ON "stock_movements"("movementDate");
