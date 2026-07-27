-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('ColorSourceType')) THEN
    EXECUTE 'CREATE TYPE "ColorSourceType" AS ENUM (''PREDEFINED'', ''USER_CREATED'', ''AUTO_GENERATED'')';
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "store_expenses" ADD COLUMN     "gstAmount" DECIMAL(10,2),
ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "isItcEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMode" TEXT,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "recurrenceFreq" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "vendorGstin" TEXT;

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "semantic" TEXT,
    "source" "ColorSourceType" NOT NULL,
    "aliases" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "lastVisitAt" TIMESTAMP(3),
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_budgets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colors_name_key" ON "colors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "colors_hex_key" ON "colors"("hex");

-- CreateIndex
CREATE INDEX "colors_category_idx" ON "colors"("category");

-- CreateIndex
CREATE INDEX "colors_semantic_idx" ON "colors"("semantic");

-- CreateIndex
CREATE INDEX "colors_createdBy_idx" ON "colors"("createdBy");

-- CreateIndex
CREATE INDEX "customers_orgId_idx" ON "customers"("orgId");

-- CreateIndex
CREATE INDEX "customers_mobile_idx" ON "customers"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "customers_orgId_mobile_key" ON "customers"("orgId", "mobile");

-- CreateIndex
CREATE INDEX "expense_budgets_orgId_idx" ON "expense_budgets"("orgId");

-- CreateIndex
CREATE INDEX "expense_budgets_storeId_idx" ON "expense_budgets"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_budgets_storeId_category_month_year_key" ON "expense_budgets"("storeId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- CreateIndex
CREATE INDEX "store_expenses_status_idx" ON "store_expenses"("status");

-- AddForeignKey
ALTER TABLE "colors" ADD CONSTRAINT "colors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
