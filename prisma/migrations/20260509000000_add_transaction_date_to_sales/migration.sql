-- AlterTable
ALTER TABLE "sales" ADD COLUMN "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "sales_transactionDate_idx" ON "sales"("transactionDate");
