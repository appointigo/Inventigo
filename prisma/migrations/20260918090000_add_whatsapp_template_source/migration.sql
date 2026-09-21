CREATE TYPE "WhatsAppTemplateSource" AS ENUM ('SYSTEM', 'MERCHANT', 'META_IMPORTED');

ALTER TABLE "whatsapp_template_definitions"
ADD COLUMN "source" "WhatsAppTemplateSource" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "displayLabel" TEXT;

CREATE INDEX "whatsapp_template_definitions_source_idx"
ON "whatsapp_template_definitions"("source");
