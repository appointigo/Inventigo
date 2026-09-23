-- Store-scoped default for approved WhatsApp invoice templates.
ALTER TABLE "store_whatsapp_profiles"
ADD COLUMN "defaultInvoiceTemplateInstanceId" TEXT;

CREATE INDEX "store_whatsapp_profiles_defaultInvoiceTemplateInstanceId_idx"
ON "store_whatsapp_profiles"("defaultInvoiceTemplateInstanceId");

ALTER TABLE "store_whatsapp_profiles"
ADD CONSTRAINT "store_whatsapp_profiles_defaultInvoiceTemplateInstanceId_fkey"
FOREIGN KEY ("defaultInvoiceTemplateInstanceId")
REFERENCES "whatsapp_template_instances"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
