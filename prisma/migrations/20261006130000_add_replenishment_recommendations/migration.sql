CREATE TYPE "ReplenishmentRecommendationType" AS ENUM ('REORDER', 'NO_REORDER', 'STOCKOUT_RISK', 'INBOUND_COVERS_DEMAND', 'OVERSTOCK', 'MARKDOWN_CANDIDATE', 'MONITOR');
CREATE TYPE "RecommendationEvidenceQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "RecommendationDisposition" AS ENUM ('OPEN', 'ACCEPTED', 'DISMISSED', 'IGNORED');
CREATE TABLE "replenishment_recommendations" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL, "sizeId" TEXT NOT NULL,
  "type" "ReplenishmentRecommendationType" NOT NULL, "severity" TEXT NOT NULL,
  "recommendedQuantity" INTEGER, "reasonCodes" TEXT[], "reasons" TEXT[], "evidence" JSONB NOT NULL,
  "evidenceQuality" "RecommendationEvidenceQuality" NOT NULL,
  "observationFrom" TIMESTAMP(3) NOT NULL, "observationTo" TIMESTAMP(3) NOT NULL,
  "horizonDays" INTEGER NOT NULL, "disposition" "RecommendationDisposition" NOT NULL DEFAULT 'OPEN',
  "linkedPurchaseOrderId" TEXT, "outcome" JSONB, "evaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "replenishment_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "replenishment_recommendations_storeId_productId_sizeId_observationFrom_observationTo_type_key" ON "replenishment_recommendations"("storeId", "productId", "sizeId", "observationFrom", "observationTo", "type");
CREATE INDEX "replenishment_recommendations_orgId_storeId_createdAt_idx" ON "replenishment_recommendations"("orgId", "storeId", "createdAt");
CREATE INDEX "replenishment_recommendations_storeId_type_disposition_idx" ON "replenishment_recommendations"("storeId", "type", "disposition");
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_linkedPurchaseOrderId_fkey" FOREIGN KEY ("linkedPurchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
