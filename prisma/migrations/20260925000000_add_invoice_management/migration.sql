-- Store-scoped invoice presentation, delivery defaults, and immutable policy versions.
CREATE TABLE "store_invoice_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "designKey" TEXT NOT NULL DEFAULT 'CLASSIC',
    "designVersion" INTEGER NOT NULL DEFAULT 1,
    "defaultWhatsAppEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activePolicyVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_invoice_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_policy_versions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "termsText" TEXT,
    "returnPolicyText" TEXT,
    "thankYouMessage" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_policy_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sales"
ADD COLUMN "invoicePolicyVersionId" TEXT,
ADD COLUMN "invoiceSnapshot" JSONB;

ALTER TABLE "return_transactions"
ADD COLUMN "invoicePolicyVersionId" TEXT,
ADD COLUMN "invoiceSnapshot" JSONB;

ALTER TABLE "store_whatsapp_profiles"
ADD COLUMN "defaultExchangeInvoiceTemplateInstanceId" TEXT;

CREATE UNIQUE INDEX "store_invoice_settings_storeId_key" ON "store_invoice_settings"("storeId");
CREATE INDEX "store_invoice_settings_activePolicyVersionId_idx" ON "store_invoice_settings"("activePolicyVersionId");
CREATE UNIQUE INDEX "invoice_policy_versions_storeId_version_key" ON "invoice_policy_versions"("storeId", "version");
CREATE INDEX "invoice_policy_versions_storeId_effectiveFrom_idx" ON "invoice_policy_versions"("storeId", "effectiveFrom");
CREATE INDEX "sales_invoicePolicyVersionId_idx" ON "sales"("invoicePolicyVersionId");
CREATE INDEX "return_transactions_invoicePolicyVersionId_idx" ON "return_transactions"("invoicePolicyVersionId");
CREATE INDEX "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInstanceId_idx" ON "store_whatsapp_profiles"("defaultExchangeInvoiceTemplateInstanceId");

ALTER TABLE "store_invoice_settings"
ADD CONSTRAINT "store_invoice_settings_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_policy_versions"
ADD CONSTRAINT "invoice_policy_versions_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_invoice_settings"
ADD CONSTRAINT "store_invoice_settings_activePolicyVersionId_fkey"
FOREIGN KEY ("activePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_invoicePolicyVersionId_fkey"
FOREIGN KEY ("invoicePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_transactions"
ADD CONSTRAINT "return_transactions_invoicePolicyVersionId_fkey"
FOREIGN KEY ("invoicePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_whatsapp_profiles"
ADD CONSTRAINT "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInstanceId_fkey"
FOREIGN KEY ("defaultExchangeInvoiceTemplateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
