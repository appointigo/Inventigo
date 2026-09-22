CREATE TYPE "public"."VisitOutcome" AS ENUM ('CONVERTED', 'NOT_CONVERTED', 'PARTIALLY_CONVERTED', 'BROWSING');
CREATE TYPE "public"."DemandRequestStatus" AS ENUM ('FULFILLED', 'PARTIALLY_FULFILLED', 'UNFULFILLED', 'ABANDONED');
CREATE TYPE "public"."DemandReasonCode" AS ENUM ('OUT_OF_STOCK', 'VARIANT_UNAVAILABLE', 'PRODUCT_UNAVAILABLE', 'BRAND_UNAVAILABLE', 'FEATURE_UNAVAILABLE', 'PRICE_TOO_HIGH', 'COLOR_UNAVAILABLE', 'SIZE_UNAVAILABLE', 'CUSTOMER_CHANGED_MIND', 'JUST_BROWSING', 'OTHER');

CREATE TABLE "customer_visits" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "outcome" "public"."VisitOutcome" NOT NULL,
  "linkedSaleId" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "createdBy" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_visits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demand_requests" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "categoryId" TEXT,
  "brandId" TEXT,
  "productId" TEXT,
  "requestedQuantity" INTEGER NOT NULL DEFAULT 1,
  "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
  "status" "public"."DemandRequestStatus" NOT NULL,
  "reasonCode" "public"."DemandReasonCode" NOT NULL,
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "demand_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_visits_linkedSaleId_key" ON "customer_visits"("linkedSaleId");
CREATE UNIQUE INDEX "customer_visits_idempotencyKey_key" ON "customer_visits"("idempotencyKey");
CREATE INDEX "customer_visits_orgId_idx" ON "customer_visits"("orgId");
CREATE INDEX "customer_visits_storeId_visitedAt_idx" ON "customer_visits"("storeId", "visitedAt");
CREATE INDEX "customer_visits_outcome_idx" ON "customer_visits"("outcome");
CREATE INDEX "demand_requests_storeId_createdAt_idx" ON "demand_requests"("storeId", "createdAt");
CREATE INDEX "demand_requests_visitId_idx" ON "demand_requests"("visitId");
CREATE INDEX "demand_requests_categoryId_idx" ON "demand_requests"("categoryId");
CREATE INDEX "demand_requests_productId_idx" ON "demand_requests"("productId");
CREATE INDEX "demand_requests_reasonCode_idx" ON "demand_requests"("reasonCode");

ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "customer_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
