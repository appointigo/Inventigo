-- CreateEnum
CREATE TYPE "SaasCatalogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SaasBillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SaasTaxMode" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "SaasFeatureType" AS ENUM ('BOOLEAN', 'INTEGER', 'ENUM', 'SET', 'DECIMAL');

-- CreateEnum
CREATE TYPE "SaasBillingStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SaasGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "saasAccessRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "saas_plans" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_plans_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "saas_plan_versions" (
    "id" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SaasCatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_plan_prices" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "interval" "SaasBillingInterval" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amountMinor" INTEGER NOT NULL,
    "taxMode" "SaasTaxMode" NOT NULL,
    "providerPlanId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_feature_definitions" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "valueType" "SaasFeatureType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_feature_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "saas_plan_features" (
    "planVersionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "saas_plan_features_pkey" PRIMARY KEY ("planVersionId","featureKey")
);

-- CreateTable
CREATE TABLE "saas_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "planPriceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "billingStatus" "SaasBillingStatus" NOT NULL DEFAULT 'PENDING',
    "paidThrough" TIMESTAMPTZ(3),
    "recurringAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saas_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_access_grants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "status" "SaasGrantStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reviewAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saas_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saas_plan_versions_status_publishedAt_idx" ON "saas_plan_versions"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_versions_planKey_version_key" ON "saas_plan_versions"("planKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_prices_providerPlanId_key" ON "saas_plan_prices"("providerPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_prices_planVersionId_interval_currency_key" ON "saas_plan_prices"("planVersionId", "interval", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_prices_id_planVersionId_key" ON "saas_plan_prices"("id", "planVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "saas_subscriptions_providerSubscriptionId_key" ON "saas_subscriptions"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "saas_subscriptions_organizationId_createdAt_idx" ON "saas_subscriptions"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "saas_subscriptions_billingStatus_paidThrough_idx" ON "saas_subscriptions"("billingStatus", "paidThrough");

-- CreateIndex
CREATE INDEX "saas_access_grants_organizationId_status_startsAt_endsAt_idx" ON "saas_access_grants"("organizationId", "status", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "saas_plan_versions" ADD CONSTRAINT "saas_plan_versions_planKey_fkey" FOREIGN KEY ("planKey") REFERENCES "saas_plans"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_prices" ADD CONSTRAINT "saas_plan_prices_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "saas_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_features" ADD CONSTRAINT "saas_plan_features_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "saas_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_plan_features" ADD CONSTRAINT "saas_plan_features_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "saas_feature_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "saas_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_subscriptions" ADD CONSTRAINT "saas_subscriptions_planPriceId_planVersionId_fkey" FOREIGN KEY ("planPriceId", "planVersionId") REFERENCES "saas_plan_prices"("id", "planVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_access_grants" ADD CONSTRAINT "saas_access_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_access_grants" ADD CONSTRAINT "saas_access_grants_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "saas_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A tenant can have historical subscriptions, but only one current primary line.
CREATE UNIQUE INDEX "saas_subscriptions_one_current_per_org"
ON "saas_subscriptions"("organizationId") WHERE "isCurrent" = true;

ALTER TABLE "saas_plan_prices"
ADD CONSTRAINT "saas_plan_prices_amount_positive" CHECK ("amountMinor" > 0),
ADD CONSTRAINT "saas_plan_prices_currency_iso_length" CHECK (char_length("currency") = 3);

ALTER TABLE "saas_access_grants"
ADD CONSTRAINT "saas_access_grants_positive_window" CHECK ("startsAt" < "endsAt");
