-- Add round-off fields to sales table for proper retail billing
ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "calculatedTotal" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "roundOffAmount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "finalPayableAmount" DECIMAL(10,2);