ALTER TABLE "customer_follow_ups"
  ALTER COLUMN "title" DROP DEFAULT;

ALTER TABLE "customers"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "store_whatsapp_profiles"
  RENAME CONSTRAINT "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInstanceI"
  TO "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInst_fkey";

ALTER INDEX "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInstanceI"
  RENAME TO "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInsta_idx";
