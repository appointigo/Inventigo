-- CreateEnum
CREATE TYPE "public"."PurchaseStatus" AS ENUM ('RECORDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."purchases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseNumber" TEXT NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "supplierInvoiceNumber" TEXT,
    "manufacturerSnapshot" TEXT,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "additionalCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryNameSnapshot" TEXT NOT NULL,
    "attributesSnapshot" JSONB NOT NULL DEFAULT '{}',
    "unitSnapshot" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_item_options" (
    "id" TEXT NOT NULL,
    "purchaseItemId" TEXT NOT NULL,
    "sizeId" TEXT,
    "optionLabelSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_orgId_purchaseNumber_key" ON "public"."purchases"("orgId", "purchaseNumber");

-- CreateIndex
CREATE INDEX "purchases_orgId_storeId_purchaseDate_idx" ON "public"."purchases"("orgId", "storeId", "purchaseDate");

-- CreateIndex
CREATE INDEX "purchases_orgId_supplierId_idx" ON "public"."purchases"("orgId", "supplierId");

-- CreateIndex
CREATE INDEX "purchases_orgId_status_idx" ON "public"."purchases"("orgId", "status");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "public"."purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_items_categoryId_idx" ON "public"."purchase_items"("categoryId");

-- CreateIndex
CREATE INDEX "purchase_item_options_purchaseItemId_idx" ON "public"."purchase_item_options"("purchaseItemId");

-- CreateIndex
CREATE INDEX "purchase_item_options_sizeId_idx" ON "public"."purchase_item_options"("sizeId");

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_item_options" ADD CONSTRAINT "purchase_item_options_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "public"."purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_item_options" ADD CONSTRAINT "purchase_item_options_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "public"."sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guard invariants even if records are written outside the application service.
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_positive_quantity_check" CHECK ("totalQuantity" > 0);
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_nonnegative_money_check" CHECK ("unitCost" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "public"."purchase_item_options" ADD CONSTRAINT "purchase_item_options_positive_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_nonnegative_money_check" CHECK ("subtotal" >= 0 AND "additionalCharges" >= 0 AND "discountAmount" >= 0 AND "totalAmount" >= 0);
