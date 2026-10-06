-- Release 7 creates finance evidence prospectively. It deliberately does not
-- backfill balances, expense payments, supplier payments, or refund settlements.
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'UPI_SETTLEMENT', 'OTHER');
CREATE TYPE "FinancialDirection" AS ENUM ('INFLOW', 'OUTFLOW');
CREATE TYPE "FinancialReferenceType" AS ENUM ('SALE_PAYMENT', 'EXPENSE', 'SUPPLIER_PAYMENT', 'REFUND_SETTLEMENT', 'ACCOUNT_TRANSFER', 'ADJUSTMENT');
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('UNKNOWN', 'UNPAID', 'PAID');
CREATE TYPE "SupplierPayableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
CREATE TYPE "RefundLiabilityStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED', 'CANCELLED');

ALTER TABLE "store_expenses"
  ADD COLUMN "paymentStatus" "ExpensePaymentStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "financialAccountId" TEXT;

CREATE TABLE "financial_accounts" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT, "name" TEXT NOT NULL,
  "type" "FinancialAccountType" NOT NULL, "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "openingBalanceAsOf" DATE,
  "currency" TEXT NOT NULL DEFAULT 'INR', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_method_account_mappings" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL, "accountId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_method_account_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_account_transfers" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT, "sourceAccountId" TEXT NOT NULL,
  "destinationAccountId" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
  "businessDate" DATE NOT NULL, "reference" TEXT, "notes" TEXT, "createdBy" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_account_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_payables" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "supplierId" TEXT NOT NULL,
  "purchaseOrderId" TEXT, "receiptId" TEXT, "supplierInvoiceNumber" TEXT, "invoiceDate" DATE NOT NULL,
  "dueDate" DATE, "originalAmount" DECIMAL(14,2) NOT NULL, "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outstandingAmount" DECIMAL(14,2) NOT NULL, "status" "SupplierPayableStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_payments" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "payableId" TEXT NOT NULL,
  "accountId" TEXT, "amount" DECIMAL(14,2) NOT NULL, "method" TEXT, "paymentDate" DATE NOT NULL,
  "reference" TEXT, "notes" TEXT, "createdBy" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_liabilities" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "returnTransactionId" TEXT NOT NULL,
  "liabilityAmount" DECIMAL(14,2) NOT NULL, "settledAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outstandingAmount" DECIMAL(14,2) NOT NULL, "status" "RefundLiabilityStatus" NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refund_liabilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_settlements" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT NOT NULL, "liabilityId" TEXT NOT NULL,
  "accountId" TEXT, "amount" DECIMAL(14,2) NOT NULL, "method" TEXT, "settledAt" DATE NOT NULL,
  "reference" TEXT, "notes" TEXT, "createdBy" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_settlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_transactions" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "storeId" TEXT, "accountId" TEXT,
  "direction" "FinancialDirection" NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
  "businessDate" DATE NOT NULL, "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceType" "FinancialReferenceType" NOT NULL, "referenceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "category" TEXT NOT NULL, "description" TEXT, "metadata" JSONB,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "salePaymentId" TEXT, "expenseId" TEXT, "supplierPaymentId" TEXT, "refundSettlementId" TEXT,
  "transferId" TEXT,
  CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_accounts_orgId_name_key" ON "financial_accounts"("orgId", "name");
CREATE INDEX "financial_accounts_orgId_storeId_isActive_idx" ON "financial_accounts"("orgId", "storeId", "isActive");
CREATE UNIQUE INDEX "payment_method_account_mappings_orgId_storeId_paymentMethod_key" ON "payment_method_account_mappings"("orgId", "storeId", "paymentMethod");
CREATE INDEX "payment_method_account_mappings_accountId_idx" ON "payment_method_account_mappings"("accountId");
CREATE INDEX "financial_account_transfers_orgId_businessDate_idx" ON "financial_account_transfers"("orgId", "businessDate");
CREATE UNIQUE INDEX "financial_account_transfers_idempotencyKey_key" ON "financial_account_transfers"("idempotencyKey");
CREATE INDEX "financial_account_transfers_sourceAccountId_idx" ON "financial_account_transfers"("sourceAccountId");
CREATE INDEX "financial_account_transfers_destinationAccountId_idx" ON "financial_account_transfers"("destinationAccountId");
CREATE UNIQUE INDEX "supplier_payables_orgId_receiptId_supplierInvoiceNumber_key" ON "supplier_payables"("orgId", "receiptId", "supplierInvoiceNumber");
CREATE UNIQUE INDEX "supplier_payables_receiptId_key" ON "supplier_payables"("receiptId");
CREATE INDEX "supplier_payables_orgId_storeId_status_dueDate_idx" ON "supplier_payables"("orgId", "storeId", "status", "dueDate");
CREATE INDEX "supplier_payables_supplierId_status_idx" ON "supplier_payables"("supplierId", "status");
CREATE INDEX "supplier_payments_orgId_paymentDate_idx" ON "supplier_payments"("orgId", "paymentDate");
CREATE UNIQUE INDEX "supplier_payments_idempotencyKey_key" ON "supplier_payments"("idempotencyKey");
CREATE INDEX "supplier_payments_payableId_paymentDate_idx" ON "supplier_payments"("payableId", "paymentDate");
CREATE UNIQUE INDEX "refund_liabilities_returnTransactionId_key" ON "refund_liabilities"("returnTransactionId");
CREATE INDEX "refund_liabilities_orgId_storeId_status_idx" ON "refund_liabilities"("orgId", "storeId", "status");
CREATE INDEX "refund_settlements_orgId_settledAt_idx" ON "refund_settlements"("orgId", "settledAt");
CREATE UNIQUE INDEX "refund_settlements_idempotencyKey_key" ON "refund_settlements"("idempotencyKey");
CREATE INDEX "refund_settlements_liabilityId_settledAt_idx" ON "refund_settlements"("liabilityId", "settledAt");
CREATE UNIQUE INDEX "financial_transactions_idempotencyKey_key" ON "financial_transactions"("idempotencyKey");
CREATE UNIQUE INDEX "financial_transactions_salePaymentId_key" ON "financial_transactions"("salePaymentId");
CREATE UNIQUE INDEX "financial_transactions_expenseId_key" ON "financial_transactions"("expenseId");
CREATE UNIQUE INDEX "financial_transactions_supplierPaymentId_key" ON "financial_transactions"("supplierPaymentId");
CREATE UNIQUE INDEX "financial_transactions_refundSettlementId_key" ON "financial_transactions"("refundSettlementId");
CREATE INDEX "financial_transactions_orgId_businessDate_idx" ON "financial_transactions"("orgId", "businessDate");
CREATE INDEX "financial_transactions_storeId_businessDate_idx" ON "financial_transactions"("storeId", "businessDate");
CREATE INDEX "financial_transactions_accountId_businessDate_idx" ON "financial_transactions"("accountId", "businessDate");
CREATE INDEX "financial_transactions_referenceType_referenceId_idx" ON "financial_transactions"("referenceType", "referenceId");
CREATE INDEX "store_expenses_paymentStatus_paidAt_idx" ON "store_expenses"("paymentStatus", "paidAt");
CREATE INDEX "store_expenses_financialAccountId_idx" ON "store_expenses"("financialAccountId");

ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_expenses" ADD CONSTRAINT "store_expenses_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_returnTransactionId_fkey" FOREIGN KEY ("returnTransactionId") REFERENCES "return_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "refund_liabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_salePaymentId_fkey" FOREIGN KEY ("salePaymentId") REFERENCES "sale_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "store_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "supplier_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_refundSettlementId_fkey" FOREIGN KEY ("refundSettlementId") REFERENCES "refund_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "financial_account_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
