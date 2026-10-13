-- Additive purchase-management foundation. No historical costs, invoices or claims are fabricated.
CREATE TYPE "ProductTrackingMode" AS ENUM ('NONE', 'BATCH', 'SERIAL');
CREATE TYPE "ReceiptPostingStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE "ReceiptInspectionStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PARTIAL', 'COMPLETED');
CREATE TYPE "PurchaseDiscrepancyType" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'WRONG_SIZE', 'WRONG_COLOUR', 'MISSING_ACCESSORY', 'EXPIRED', 'PACKAGING_DAMAGE', 'QUALITY_FAILURE', 'OTHER');
CREATE TYPE "PurchaseDiscrepancyStatus" AS ENUM ('OPEN', 'CLAIMED', 'RESOLVED', 'CANCELLED');
CREATE TYPE "SupplierClaimStatus" AS ENUM ('OPEN', 'RETURN_TO_SUPPLIER', 'REPLACEMENT_PENDING', 'CREDIT_NOTE_REQUESTED', 'RESOLVED', 'CANCELLED');
CREATE TYPE "ClaimResolutionType" AS ENUM ('RETURN', 'REPLACEMENT', 'CREDIT_NOTE');
CREATE TYPE "SupplierBillStatus" AS ENUM ('DRAFT', 'VALIDATED', 'DISPUTED', 'APPROVED', 'POSTED', 'CANCELLED');
CREATE TYPE "SupplierBillMatchStatus" AS ENUM ('PENDING', 'MATCHED', 'DIFFERENCE', 'APPROVED_WITH_DIFFERENCE');
CREATE TYPE "InventoryValuationEventType" AS ENUM ('OPENING', 'RECEIPT', 'RETURN_TO_SUPPLIER', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'REVERSAL');
CREATE TYPE "PurchaseOrderSource" AS ENUM ('PURCHASE_ORDER', 'DIRECT_PURCHASE');

ALTER TABLE "purchase_orders"
  ADD COLUMN "orgId" TEXT,
  ADD COLUMN "source" "PurchaseOrderSource" NOT NULL DEFAULT 'PURCHASE_ORDER',
  ADD COLUMN "poNumber" TEXT,
  ADD COLUMN "deliveryInstructions" TEXT,
  ADD COLUMN "orderDate" DATE,
  ADD COLUMN "issuedAt" TIMESTAMP(3),
  ADD COLUMN "issuedBy" TEXT,
  ADD COLUMN "issuedSnapshot" JSONB;

UPDATE "purchase_orders" po
SET "orgId" = s."orgId",
    "poNumber" = 'PO-LEGACY-' || upper(substr(replace(po.id, '-', ''), 1, 12)),
    "orderDate" = po."createdAt"::date
FROM "stores" s
WHERE s.id = po."storeId";

ALTER TABLE "purchase_orders"
  ALTER COLUMN "orgId" SET NOT NULL,
  ALTER COLUMN "poNumber" SET NOT NULL,
  ALTER COLUMN "orderDate" SET NOT NULL,
  ALTER COLUMN "orderDate" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "purchase_orders_orgId_poNumber_key" ON "purchase_orders"("orgId", "poNumber");
CREATE INDEX "purchase_orders_orgId_status_orderDate_idx" ON "purchase_orders"("orgId", "status", "orderDate");
CREATE INDEX "purchase_orders_issuedBy_idx" ON "purchase_orders"("issuedBy");

CREATE TABLE "product_variants" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sizeId" TEXT,
  "sku" TEXT NOT NULL,
  "externalBarcode" TEXT,
  "label" TEXT NOT NULL,
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_variants_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_variants_orgId_sku_key" ON "product_variants"("orgId", "sku");
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");
CREATE INDEX "product_variants_sizeId_idx" ON "product_variants"("sizeId");

ALTER TABLE "stock_entries" ADD COLUMN "variantId" TEXT;
ALTER TABLE "stock_entries" ADD COLUMN "averageUnitCost" DECIMAL(14,4);
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "stock_entries_variantId_storeId_idx" ON "stock_entries"("variantId", "storeId");
ALTER TABLE "stock_movements" ADD COLUMN "variantId" TEXT;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "stock_movements_variantId_storeId_movementDate_idx" ON "stock_movements"("variantId", "storeId", "movementDate");

ALTER TABLE "purchase_order_items" ADD COLUMN "variantId" TEXT;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "purchase_order_items_variantId_idx" ON "purchase_order_items"("variantId");

ALTER TABLE "purchase_order_receipts"
  ADD COLUMN "payloadHash" TEXT,
  ADD COLUMN "receiptNumber" TEXT,
  ADD COLUMN "orgId" TEXT,
  ADD COLUMN "storeId" TEXT,
  ADD COLUMN "postingStatus" "ReceiptPostingStatus" NOT NULL DEFAULT 'POSTED',
  ADD COLUMN "inspectionStatus" "ReceiptInspectionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "postedAt" TIMESTAMP(3),
  ADD COLUMN "sourceSnapshot" JSONB,
  ADD COLUMN "reversalOfId" TEXT;

UPDATE "purchase_order_receipts" r
SET "payloadHash" = 'legacy:' || r."confirmationId",
    "receiptNumber" = 'GRN-LEGACY-' || upper(substr(replace(r.id, '-', ''), 1, 12)),
    "orgId" = po."orgId",
    "storeId" = po."storeId",
    "postedAt" = r."createdAt"
FROM "purchase_orders" po
WHERE po.id = r."purchaseOrderId";

ALTER TABLE "purchase_order_receipts"
  ALTER COLUMN "payloadHash" SET NOT NULL,
  ALTER COLUMN "receiptNumber" SET NOT NULL,
  ALTER COLUMN "orgId" SET NOT NULL,
  ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "purchase_order_receipts_orgId_receiptNumber_key" ON "purchase_order_receipts"("orgId", "receiptNumber");
CREATE INDEX "purchase_order_receipts_storeId_receivedAt_idx" ON "purchase_order_receipts"("storeId", "receivedAt");
CREATE INDEX "purchase_order_receipts_reversalOfId_idx" ON "purchase_order_receipts"("reversalOfId");

ALTER TABLE "purchase_order_receipt_items"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "quantityHeld" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inspectionStatus" "ReceiptInspectionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "notes" TEXT;
UPDATE "purchase_order_receipt_items" SET "quantityHeld" = "quantityDamaged" WHERE "quantityDamaged" > 0;
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "purchase_order_receipt_items_variantId_idx" ON "purchase_order_receipt_items"("variantId");

CREATE TABLE "purchasing_policies" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT, "categoryId" TEXT,
  "inspectionRequired" BOOLEAN NOT NULL DEFAULT false,
  "trackingMode" "ProductTrackingMode" NOT NULL DEFAULT 'NONE',
  "variantFields" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchasing_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchasing_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchasing_policies_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchasing_policies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "purchasing_policies_orgId_storeId_categoryId_key" ON "purchasing_policies"("orgId", "storeId", "categoryId");
CREATE INDEX "purchasing_policies_orgId_categoryId_idx" ON "purchasing_policies"("orgId", "categoryId");

CREATE TABLE "purchase_discrepancies" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "discrepancyNumber" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "receiptItemId" TEXT NOT NULL, "purchaseOrderItemId" TEXT NOT NULL,
  "variantId" TEXT, "issueType" "PurchaseDiscrepancyType" NOT NULL, "quantity" INTEGER NOT NULL, "reason" TEXT NOT NULL,
  "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[], "status" "PurchaseDiscrepancyStatus" NOT NULL DEFAULT 'OPEN', "disposition" TEXT,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "purchase_discrepancies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_discrepancies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "purchase_order_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_discrepancies_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "purchase_discrepancies_orgId_discrepancyNumber_key" ON "purchase_discrepancies"("orgId", "discrepancyNumber");
CREATE INDEX "purchase_discrepancies_orgId_storeId_status_idx" ON "purchase_discrepancies"("orgId", "storeId", "status");
CREATE INDEX "purchase_discrepancies_receiptId_receiptItemId_idx" ON "purchase_discrepancies"("receiptId", "receiptItemId");

CREATE TABLE "supplier_claims" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "claimNumber" TEXT NOT NULL, "supplierId" TEXT NOT NULL,
  "discrepancyId" TEXT NOT NULL, "status" "SupplierClaimStatus" NOT NULL DEFAULT 'OPEN', "requestedResolution" "ClaimResolutionType" NOT NULL,
  "quantity" INTEGER NOT NULL, "expectedReplacementAt" DATE, "returnAuthorization" TEXT, "returnDispatchedAt" TIMESTAMP(3), "notes" TEXT,
  "createdBy" TEXT NOT NULL, "resolvedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "supplier_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_claims_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_claims_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_claims_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_claims_discrepancyId_fkey" FOREIGN KEY ("discrepancyId") REFERENCES "purchase_discrepancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_claims_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_claims_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "supplier_claims_orgId_claimNumber_key" ON "supplier_claims"("orgId", "claimNumber");
CREATE INDEX "supplier_claims_orgId_storeId_status_idx" ON "supplier_claims"("orgId", "storeId", "status");
CREATE INDEX "supplier_claims_supplierId_status_idx" ON "supplier_claims"("supplierId", "status");

CREATE TABLE "supplier_bills" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "supplierId" TEXT NOT NULL, "purchaseOrderId" TEXT,
  "billNumber" TEXT NOT NULL, "supplierInvoiceNumber" TEXT NOT NULL, "invoiceDate" DATE NOT NULL, "dueDate" DATE,
  "status" "SupplierBillStatus" NOT NULL DEFAULT 'DRAFT', "matchStatus" "SupplierBillMatchStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(14,2) NOT NULL, "additionalCharges" DECIMAL(14,2) NOT NULL DEFAULT 0, "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "totalAmount" DECIMAL(14,2) NOT NULL,
  "differenceReason" TEXT, "notes" TEXT, "createdBy" TEXT NOT NULL, "postedBy" TEXT, "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_bills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_bills_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_bills_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bills_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bills_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bills_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bills_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "supplier_bills_orgId_billNumber_key" ON "supplier_bills"("orgId", "billNumber");
CREATE UNIQUE INDEX "supplier_bills_orgId_supplierId_supplierInvoiceNumber_key" ON "supplier_bills"("orgId", "supplierId", "supplierInvoiceNumber");
CREATE INDEX "supplier_bills_orgId_storeId_status_dueDate_idx" ON "supplier_bills"("orgId", "storeId", "status", "dueDate");
CREATE INDEX "supplier_bills_purchaseOrderId_idx" ON "supplier_bills"("purchaseOrderId");

CREATE TABLE "supplier_bill_lines" (
  "id" TEXT NOT NULL, "billId" TEXT NOT NULL, "purchaseOrderItemId" TEXT, "variantId" TEXT, "description" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL, "unitCost" DECIMAL(14,2) NOT NULL, "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "supplier_bill_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_bill_lines_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_bill_lines_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bill_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "supplier_bill_lines_billId_idx" ON "supplier_bill_lines"("billId");
CREATE INDEX "supplier_bill_lines_purchaseOrderItemId_idx" ON "supplier_bill_lines"("purchaseOrderItemId");

CREATE TABLE "supplier_bill_receipt_allocations" (
  "id" TEXT NOT NULL, "billId" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "receiptItemId" TEXT,
  "quantity" DECIMAL(14,3) NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_bill_receipt_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_bill_receipt_allocations_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_bill_receipt_allocations_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_bill_receipt_allocations_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "purchase_order_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "supplier_bill_alloc_bill_receipt_item_key" ON "supplier_bill_receipt_allocations"("billId", "receiptId", "receiptItemId");
CREATE INDEX "supplier_bill_receipt_allocations_receiptId_idx" ON "supplier_bill_receipt_allocations"("receiptId");

CREATE TABLE "supplier_bill_attachments" (
  "id" TEXT NOT NULL, "billId" TEXT NOT NULL, "fileName" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_bill_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_bill_attachments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "supplier_bill_attachments_billId_idx" ON "supplier_bill_attachments"("billId");

CREATE TABLE "supplier_credit_notes" (
  "id" TEXT NOT NULL, "billId" TEXT, "claimId" TEXT, "creditNoteNumber" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
  "issuedAt" DATE NOT NULL, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_credit_notes_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_credit_notes_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "supplier_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "supplier_credit_notes_billId_idx" ON "supplier_credit_notes"("billId");
CREATE INDEX "supplier_credit_notes_claimId_idx" ON "supplier_credit_notes"("claimId");

CREATE TABLE "inventory_valuation_events" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "productId" TEXT NOT NULL, "variantId" TEXT,
  "receiptId" TEXT, "receiptItemId" TEXT, "eventType" "InventoryValuationEventType" NOT NULL, "quantity" INTEGER NOT NULL,
  "unitCost" DECIMAL(14,4) NOT NULL, "previousAverage" DECIMAL(14,4), "resultingAverage" DECIMAL(14,4) NOT NULL,
  "resultingQuantity" INTEGER NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdBy" TEXT NOT NULL,
  CONSTRAINT "inventory_valuation_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_valuation_events_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "purchase_order_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_valuation_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "inventory_valuation_events_idempotencyKey_key" ON "inventory_valuation_events"("idempotencyKey");
CREATE INDEX "inventory_valuation_org_store_product_time_idx" ON "inventory_valuation_events"("orgId", "storeId", "productId", "occurredAt");
CREATE INDEX "inventory_valuation_events_variantId_storeId_occurredAt_idx" ON "inventory_valuation_events"("variantId", "storeId", "occurredAt");
CREATE INDEX "inventory_valuation_events_sourceType_sourceId_idx" ON "inventory_valuation_events"("sourceType", "sourceId");

ALTER TABLE "supplier_payables" ADD COLUMN "billId" TEXT;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "supplier_payables_billId_key" ON "supplier_payables"("billId");

ALTER TABLE "purchases"
  ADD COLUMN "purchaseOrderId" TEXT,
  ADD COLUMN "receiptId" TEXT,
  ADD COLUMN "billId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_billId_fkey" FOREIGN KEY ("billId") REFERENCES "supplier_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "purchases_purchaseOrderId_key" ON "purchases"("purchaseOrderId");
CREATE UNIQUE INDEX "purchases_receiptId_key" ON "purchases"("receiptId");
CREATE UNIQUE INDEX "purchases_billId_key" ON "purchases"("billId");
CREATE UNIQUE INDEX "purchases_idempotencyKey_key" ON "purchases"("idempotencyKey");
