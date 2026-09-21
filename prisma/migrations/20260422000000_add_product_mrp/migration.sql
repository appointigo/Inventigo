-- Add MRP to products without data loss.
-- 1) Add nullable column
-- 2) Backfill from existing basePrice values
-- 3) Enforce NOT NULL after backfill

ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(10,2);

UPDATE "products"
SET "mrp" = "basePrice"
WHERE "mrp" IS NULL;

ALTER TABLE "products"
ALTER COLUMN "mrp" SET NOT NULL;
