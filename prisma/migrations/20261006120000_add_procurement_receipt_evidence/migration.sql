ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_RECEIVED';
ALTER TABLE "purchase_orders" ADD COLUMN "expectedDeliveryDate" DATE;

CREATE TABLE "purchase_order_receipts" (
  "id" TEXT NOT NULL, "purchaseOrderId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedBy" TEXT NOT NULL, "supplierInvoiceNumber" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_receipts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "purchase_order_receipt_items" (
  "id" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "purchaseOrderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL, "sizeId" TEXT NOT NULL,
  "quantityReceived" INTEGER NOT NULL, "quantityAccepted" INTEGER NOT NULL,
  "quantityRejected" INTEGER NOT NULL DEFAULT 0, "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
  "rejectionReason" TEXT, "unitCostActual" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_receipt_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "product_suppliers" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "supplierId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false, "supplierSku" TEXT,
  "lastPurchaseCost" DECIMAL(10,2), "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_order_receipts_purchaseOrderId_receivedAt_idx" ON "purchase_order_receipts"("purchaseOrderId", "receivedAt");
CREATE INDEX "purchase_order_receipts_receivedBy_idx" ON "purchase_order_receipts"("receivedBy");
CREATE INDEX "purchase_order_receipt_items_receiptId_idx" ON "purchase_order_receipt_items"("receiptId");
CREATE INDEX "purchase_order_receipt_items_purchaseOrderItemId_idx" ON "purchase_order_receipt_items"("purchaseOrderItemId");
CREATE INDEX "purchase_order_receipt_items_productId_sizeId_idx" ON "purchase_order_receipt_items"("productId", "sizeId");
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "product_suppliers"("productId", "supplierId");
CREATE INDEX "product_suppliers_supplierId_isActive_idx" ON "product_suppliers"("supplierId", "isActive");
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
