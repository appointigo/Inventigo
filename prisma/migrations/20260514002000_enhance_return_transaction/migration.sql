-- Enhance return transaction to support discount, split payments, and full checkout experience
ALTER TABLE "return_transactions"
  ADD COLUMN IF NOT EXISTS "discountType" TEXT,
  ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "calculatedTotal" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "roundOffAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "finalPayable" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "splitPaymentData" JSONB,
  ADD COLUMN IF NOT EXISTS "transactionDate" TIMESTAMP(3);