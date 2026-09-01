-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('RETURN', 'EXCHANGE', 'RETURN_EXCHANGE');

-- AlterEnum
ALTER TYPE "ReferenceType" ADD VALUE 'RETURN';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "amountDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "promoVoided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_transactions" (
    "id" TEXT NOT NULL,
    "originalSaleId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "ReturnType" NOT NULL,
    "returnedItems" JSONB NOT NULL DEFAULT '[]',
    "exchangedItems" JSONB NOT NULL DEFAULT '[]',
    "netAmount" DECIMAL(10,2) NOT NULL,
    "offsetAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "refundMethod" TEXT,
    "reason" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "return_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_payments_saleId_idx" ON "sale_payments"("saleId");

-- CreateIndex
CREATE INDEX "sale_payments_paidAt_idx" ON "sale_payments"("paidAt");

-- CreateIndex
CREATE INDEX "return_transactions_originalSaleId_idx" ON "return_transactions"("originalSaleId");

-- CreateIndex
CREATE INDEX "return_transactions_storeId_idx" ON "return_transactions"("storeId");

-- CreateIndex
CREATE INDEX "return_transactions_customerId_idx" ON "return_transactions"("customerId");

-- CreateIndex
CREATE INDEX "return_transactions_createdAt_idx" ON "return_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_originalSaleId_fkey" FOREIGN KEY ("originalSaleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
