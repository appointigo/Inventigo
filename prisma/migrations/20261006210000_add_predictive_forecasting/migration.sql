-- Release 8 stores prospective, versioned forecast snapshots. Historical
-- forecasts are not backfilled because no historical prediction existed.
CREATE TYPE "ForecastReadiness" AS ENUM ('READY', 'LIMITED', 'NOT_READY');

CREATE TABLE "demand_forecasts" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sizeId" TEXT NOT NULL,
  "snapshotDate" DATE NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "horizonDays" INTEGER NOT NULL,
  "readiness" "ForecastReadiness" NOT NULL,
  "evidenceQuality" "RecommendationEvidenceQuality" NOT NULL,
  "method" TEXT,
  "expectedQuantity" DECIMAL(12,3),
  "lowerBound" DECIMAL(12,3),
  "upperBound" DECIMAL(12,3),
  "trend" TEXT NOT NULL,
  "historyFrom" DATE,
  "historyTo" DATE,
  "modelVersion" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "evaluation" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demand_forecast_outcomes" (
  "id" TEXT NOT NULL,
  "forecastId" TEXT NOT NULL,
  "actualQuantity" DECIMAL(12,3) NOT NULL,
  "absoluteError" DECIMAL(12,3) NOT NULL,
  "bias" DECIMAL(12,3) NOT NULL,
  "stockoutDistorted" BOOLEAN NOT NULL DEFAULT false,
  "actualFrom" DATE NOT NULL,
  "actualTo" DATE NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_forecast_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demand_forecasts_storeId_productId_sizeId_snapshotDate_horizonDays_modelVersion_key" ON "demand_forecasts"("storeId", "productId", "sizeId", "snapshotDate", "horizonDays", "modelVersion");
CREATE INDEX "demand_forecasts_orgId_storeId_snapshotDate_idx" ON "demand_forecasts"("orgId", "storeId", "snapshotDate");
CREATE INDEX "demand_forecasts_storeId_readiness_horizonDays_idx" ON "demand_forecasts"("storeId", "readiness", "horizonDays");
CREATE UNIQUE INDEX "demand_forecast_outcomes_forecastId_key" ON "demand_forecast_outcomes"("forecastId");
CREATE INDEX "demand_forecast_outcomes_evaluatedAt_idx" ON "demand_forecast_outcomes"("evaluatedAt");

ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_forecast_outcomes" ADD CONSTRAINT "demand_forecast_outcomes_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "demand_forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
