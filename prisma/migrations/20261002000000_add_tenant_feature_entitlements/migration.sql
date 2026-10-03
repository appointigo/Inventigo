CREATE TYPE "FeatureKey" AS ENUM ('WHATSAPP');

CREATE TABLE "tenant_features" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "feature" "FeatureKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_features_organizationId_feature_key"
ON "tenant_features"("organizationId", "feature");

CREATE INDEX "tenant_features_organizationId_idx"
ON "tenant_features"("organizationId");

ALTER TABLE "tenant_features"
ADD CONSTRAINT "tenant_features_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
