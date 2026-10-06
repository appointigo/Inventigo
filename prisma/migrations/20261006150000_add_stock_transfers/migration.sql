ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "ReferenceType" ADD VALUE 'TRANSFER';

CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISPATCHED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "stock_transfers" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "sourceStoreId" TEXT NOT NULL,
  "destinationStoreId" TEXT NOT NULL,
  "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "dispatchedById" TEXT,
  "receivedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expectedArrivalAt" TIMESTAMP(3),
  "notes" TEXT,
  "recommendationEvidence" JSONB,
  "outcome" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfers_distinct_stores" CHECK ("sourceStoreId" <> "destinationStoreId")
);

CREATE TABLE "stock_transfer_items" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sizeId" TEXT NOT NULL,
  "requestedQuantity" INTEGER NOT NULL,
  "approvedQuantity" INTEGER NOT NULL DEFAULT 0,
  "dispatchedQuantity" INTEGER NOT NULL DEFAULT 0,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfer_items_positive_requested" CHECK ("requestedQuantity" > 0),
  CONSTRAINT "stock_transfer_items_nonnegative_quantities" CHECK ("approvedQuantity" >= 0 AND "dispatchedQuantity" >= 0 AND "receivedQuantity" >= 0 AND "damagedQuantity" >= 0)
);

CREATE INDEX "stock_transfers_orgId_status_createdAt_idx" ON "stock_transfers"("orgId", "status", "createdAt");
CREATE INDEX "stock_transfers_sourceStoreId_status_idx" ON "stock_transfers"("sourceStoreId", "status");
CREATE INDEX "stock_transfers_destinationStoreId_status_idx" ON "stock_transfers"("destinationStoreId", "status");
CREATE UNIQUE INDEX "stock_transfer_items_transferId_productId_sizeId_key" ON "stock_transfer_items"("transferId", "productId", "sizeId");
CREATE INDEX "stock_transfer_items_productId_sizeId_idx" ON "stock_transfer_items"("productId", "sizeId");

ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sourceStoreId_fkey" FOREIGN KEY ("sourceStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
