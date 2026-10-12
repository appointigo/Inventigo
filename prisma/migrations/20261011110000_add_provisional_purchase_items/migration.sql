CREATE TYPE "PurchaseOrderItemKind" AS ENUM ('EXISTING_PRODUCT', 'PROVISIONAL_PRODUCT');

ALTER TABLE "purchase_order_items"
ADD COLUMN "itemKind" "PurchaseOrderItemKind" NOT NULL DEFAULT 'EXISTING_PRODUCT',
ADD COLUMN "lineGroupId" TEXT,
ADD COLUMN "brandId" TEXT,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "productNameSnapshot" TEXT,
ADD COLUMN "productSkuSnapshot" TEXT,
ADD COLUMN "brandNameSnapshot" TEXT,
ADD COLUMN "categoryNameSnapshot" TEXT,
ADD COLUMN "styleModelSnapshot" TEXT,
ADD COLUMN "colourSnapshot" TEXT,
ADD COLUMN "sizeLabelSnapshot" TEXT,
ADD COLUMN "supplierReference" TEXT,
ADD COLUMN "imageUrlSnapshot" TEXT,
ADD COLUMN "expectedSellingPrice" DECIMAL(10,2),
ADD COLUMN "notes" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedBy" TEXT;

UPDATE "purchase_order_items" AS poi
SET
  "lineGroupId" = poi."id",
  "productNameSnapshot" = product."name",
  "productSkuSnapshot" = product."sku",
  "brandId" = product."brandId",
  "categoryId" = product."categoryId",
  "brandNameSnapshot" = brand."name",
  "categoryNameSnapshot" = category."name",
  "colourSnapshot" = COALESCE(
    NULLIF(product."attributes"->>'colour', ''),
    NULLIF(product."attributes"->>'color', '')
  ),
  "sizeLabelSnapshot" = size."label",
  "resolvedAt" = poi."createdAt"
FROM "products" AS product, "brands" AS brand, "categories" AS category, "sizes" AS size
WHERE product."id" = poi."productId"
  AND brand."id" = product."brandId"
  AND category."id" = product."categoryId"
  AND size."id" = poi."sizeId";

ALTER TABLE "purchase_order_items"
ALTER COLUMN "lineGroupId" SET NOT NULL,
ALTER COLUMN "lineGroupId" SET DEFAULT gen_random_uuid()::text,
ALTER COLUMN "productNameSnapshot" SET NOT NULL,
ALTER COLUMN "sizeLabelSnapshot" SET NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "sizeId" DROP NOT NULL;

CREATE INDEX "purchase_order_items_lineGroupId_idx" ON "purchase_order_items"("lineGroupId");
CREATE INDEX "purchase_order_items_productId_sizeId_idx" ON "purchase_order_items"("productId", "sizeId");
CREATE INDEX "purchase_order_items_brandId_idx" ON "purchase_order_items"("brandId");
CREATE INDEX "purchase_order_items_categoryId_idx" ON "purchase_order_items"("categoryId");
CREATE INDEX "purchase_order_items_resolvedBy_idx" ON "purchase_order_items"("resolvedBy");

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "purchase_order_items_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "purchase_order_items_resolvedBy_fkey"
FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "purchase_order_items_catalog_identity_check"
CHECK (
  ("productId" IS NULL AND "sizeId" IS NULL)
  OR ("productId" IS NOT NULL AND "sizeId" IS NOT NULL)
) NOT VALID,
ADD CONSTRAINT "purchase_order_items_existing_identity_check"
CHECK (
  "itemKind" = 'PROVISIONAL_PRODUCT'
  OR ("productId" IS NOT NULL AND "sizeId" IS NOT NULL)
) NOT VALID,
ADD CONSTRAINT "purchase_order_items_provisional_classification_check"
CHECK (
  "itemKind" = 'EXISTING_PRODUCT'
  OR ("brandId" IS NOT NULL AND "categoryId" IS NOT NULL)
) NOT VALID,
ADD CONSTRAINT "purchase_order_items_expected_price_nonnegative"
CHECK ("expectedSellingPrice" IS NULL OR "expectedSellingPrice" >= 0) NOT VALID;

ALTER TABLE "purchase_order_receipts"
ADD COLUMN "receiptReference" TEXT;

ALTER TABLE "purchase_order_receipt_items"
ADD COLUMN "batchReference" TEXT,
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "sizeId" DROP NOT NULL;

ALTER TABLE "purchase_order_receipt_items"
ADD CONSTRAINT "purchase_order_receipt_items_catalog_identity_check"
CHECK (
  ("productId" IS NULL AND "sizeId" IS NULL)
  OR ("productId" IS NOT NULL AND "sizeId" IS NOT NULL)
) NOT VALID;

CREATE INDEX "purchase_order_receipt_items_batchReference_idx"
ON "purchase_order_receipt_items"("batchReference");

CREATE TABLE "purchase_order_receipt_defects" (
  "id" TEXT NOT NULL,
  "receiptItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_receipt_defects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_receipt_defects_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "purchase_order_receipt_defects_receiptItemId_key"
ON "purchase_order_receipt_defects"("receiptItemId");
CREATE INDEX "purchase_order_receipt_defects_createdBy_idx"
ON "purchase_order_receipt_defects"("createdBy");

ALTER TABLE "purchase_order_receipt_defects"
ADD CONSTRAINT "purchase_order_receipt_defects_receiptItemId_fkey"
FOREIGN KEY ("receiptItemId") REFERENCES "purchase_order_receipt_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "purchase_order_receipt_defects_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
