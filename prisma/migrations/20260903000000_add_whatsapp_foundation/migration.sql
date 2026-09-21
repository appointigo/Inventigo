-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('META');
CREATE TYPE "WhatsAppIntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'ACTION_REQUIRED', 'SUSPENDED', 'DISCONNECTED', 'ERROR');
CREATE TYPE "WhatsAppBusinessAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'DISABLED');
CREATE TYPE "WhatsAppPhoneNumberStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'DISCONNECTED');
CREATE TYPE "WhatsAppSenderPurpose" AS ENUM ('DEFAULT', 'TRANSACTIONAL', 'MARKETING', 'SUPPORT');
CREATE TYPE "WhatsAppTemplateScope" AS ENUM ('PLATFORM', 'ORGANIZATION');
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('UTILITY', 'MARKETING', 'AUTHENTICATION');
CREATE TYPE "WhatsAppTemplatePurpose" AS ENUM ('INVOICE', 'PAYMENT_RECEIPT', 'PAYMENT_REMINDER', 'ORDER_CONFIRMATION', 'ORDER_STATUS', 'MARKETING_PROMOTION', 'PRODUCT_LAUNCH', 'COUPON', 'OTP', 'CUSTOM');
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEMPLATE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'INTERACTIVE');
CREATE TYPE "WhatsAppMessagePurpose" AS ENUM ('INVOICE', 'PAYMENT', 'MARKETING', 'ORDER', 'SUPPORT', 'OTP', 'OTHER');
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "WhatsAppWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META',
    "status" "WhatsAppIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "credentialRef" TEXT, "metaBusinessId" TEXT, "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3), "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_business_accounts" (
    "id" TEXT NOT NULL, "integrationId" TEXT NOT NULL, "metaWabaId" TEXT NOT NULL,
    "businessName" TEXT, "status" "WhatsAppBusinessAccountStatus" NOT NULL DEFAULT 'PENDING',
    "timezone" TEXT, "currency" TEXT, "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_business_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_phone_numbers" (
    "id" TEXT NOT NULL, "wabaId" TEXT NOT NULL, "metaPhoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT NOT NULL, "normalizedPhoneNumber" TEXT, "verifiedName" TEXT,
    "qualityRating" TEXT, "messagingLimitTier" TEXT,
    "status" "WhatsAppPhoneNumberStatus" NOT NULL DEFAULT 'PENDING', "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_phone_numbers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_whatsapp_senders" (
    "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "phoneNumberId" TEXT NOT NULL,
    "purpose" "WhatsAppSenderPurpose" NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_whatsapp_senders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_whatsapp_profiles" (
    "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "displayName" TEXT NOT NULL,
    "signature" TEXT, "supportPhone" TEXT, "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_whatsapp_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_template_definitions" (
    "id" TEXT NOT NULL, "organizationId" TEXT, "scope" "WhatsAppTemplateScope" NOT NULL,
    "key" TEXT NOT NULL, "version" INTEGER NOT NULL, "language" TEXT NOT NULL,
    "purpose" "WhatsAppTemplatePurpose" NOT NULL, "category" "WhatsAppTemplateCategory" NOT NULL,
    "name" TEXT NOT NULL, "header" JSONB, "body" TEXT NOT NULL, "footer" TEXT,
    "buttons" JSONB, "variables" JSONB, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_template_definitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_template_definitions_scope_owner_check" CHECK (
      ("scope" = 'PLATFORM' AND "organizationId" IS NULL) OR
      ("scope" = 'ORGANIZATION' AND "organizationId" IS NOT NULL)
    )
);

CREATE TABLE "whatsapp_template_instances" (
    "id" TEXT NOT NULL, "definitionId" TEXT NOT NULL, "wabaId" TEXT NOT NULL,
    "metaTemplateId" TEXT, "metaTemplateName" TEXT NOT NULL,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT', "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_template_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "storeId" TEXT,
    "phoneNumberId" TEXT NOT NULL, "templateInstanceId" TEXT, "metaMessageId" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL, "type" "WhatsAppMessageType" NOT NULL,
    "purpose" "WhatsAppMessagePurpose" NOT NULL, "fromPhone" TEXT, "toPhone" TEXT,
    "referenceType" TEXT, "referenceId" TEXT, "payload" JSONB,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED', "errorCode" TEXT,
    "errorMessage" TEXT, "queuedAt" TIMESTAMP(3), "submittedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_message_events" (
    "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
    "metaStatus" TEXT, "payload" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_message_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_webhook_events" (
    "id" TEXT NOT NULL, "providerEventId" TEXT, "dedupeKey" TEXT, "eventType" TEXT,
    "payload" JSONB NOT NULL,
    "processingStatus" "WhatsAppWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processingAttempts" INTEGER NOT NULL DEFAULT 0, "processedAt" TIMESTAMP(3),
    "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_integrations_organizationId_idx" ON "whatsapp_integrations"("organizationId");
CREATE INDEX "whatsapp_integrations_status_idx" ON "whatsapp_integrations"("status");
CREATE INDEX "whatsapp_integrations_organizationId_provider_idx" ON "whatsapp_integrations"("organizationId", "provider");
CREATE UNIQUE INDEX "whatsapp_business_accounts_metaWabaId_key" ON "whatsapp_business_accounts"("metaWabaId");
CREATE INDEX "whatsapp_business_accounts_integrationId_idx" ON "whatsapp_business_accounts"("integrationId");
CREATE INDEX "whatsapp_business_accounts_status_idx" ON "whatsapp_business_accounts"("status");
CREATE UNIQUE INDEX "whatsapp_phone_numbers_metaPhoneNumberId_key" ON "whatsapp_phone_numbers"("metaPhoneNumberId");
CREATE INDEX "whatsapp_phone_numbers_wabaId_idx" ON "whatsapp_phone_numbers"("wabaId");
CREATE INDEX "whatsapp_phone_numbers_status_idx" ON "whatsapp_phone_numbers"("status");
CREATE INDEX "whatsapp_phone_numbers_normalizedPhoneNumber_idx" ON "whatsapp_phone_numbers"("normalizedPhoneNumber");
CREATE INDEX "store_whatsapp_senders_storeId_purpose_isActive_idx" ON "store_whatsapp_senders"("storeId", "purpose", "isActive");
CREATE INDEX "store_whatsapp_senders_phoneNumberId_idx" ON "store_whatsapp_senders"("phoneNumberId");
CREATE INDEX "store_whatsapp_senders_storeId_purpose_priority_idx" ON "store_whatsapp_senders"("storeId", "purpose", "priority");
CREATE UNIQUE INDEX "store_whatsapp_senders_storeId_phoneNumberId_purpose_key" ON "store_whatsapp_senders"("storeId", "phoneNumberId", "purpose");
CREATE UNIQUE INDEX "store_whatsapp_senders_active_default_key" ON "store_whatsapp_senders"("storeId", "purpose") WHERE "isDefault" = true AND "isActive" = true;
CREATE UNIQUE INDEX "store_whatsapp_profiles_storeId_key" ON "store_whatsapp_profiles"("storeId");
CREATE INDEX "whatsapp_template_definitions_scope_key_isActive_idx" ON "whatsapp_template_definitions"("scope", "key", "isActive");
CREATE INDEX "whatsapp_template_definitions_organizationId_idx" ON "whatsapp_template_definitions"("organizationId");
CREATE INDEX "whatsapp_template_definitions_purpose_category_idx" ON "whatsapp_template_definitions"("purpose", "category");
CREATE UNIQUE INDEX "whatsapp_template_definitions_platform_key" ON "whatsapp_template_definitions"("key", "version", "language") WHERE "scope" = 'PLATFORM';
CREATE UNIQUE INDEX "whatsapp_template_definitions_organization_key" ON "whatsapp_template_definitions"("organizationId", "key", "version", "language") WHERE "scope" = 'ORGANIZATION';
CREATE UNIQUE INDEX "whatsapp_template_instances_metaTemplateId_key" ON "whatsapp_template_instances"("metaTemplateId");
CREATE INDEX "whatsapp_template_instances_wabaId_status_idx" ON "whatsapp_template_instances"("wabaId", "status");
CREATE INDEX "whatsapp_template_instances_definitionId_idx" ON "whatsapp_template_instances"("definitionId");
CREATE UNIQUE INDEX "whatsapp_template_instances_wabaId_definitionId_key" ON "whatsapp_template_instances"("wabaId", "definitionId");
CREATE UNIQUE INDEX "whatsapp_messages_metaMessageId_key" ON "whatsapp_messages"("metaMessageId");
CREATE INDEX "whatsapp_messages_organizationId_createdAt_idx" ON "whatsapp_messages"("organizationId", "createdAt");
CREATE INDEX "whatsapp_messages_storeId_createdAt_idx" ON "whatsapp_messages"("storeId", "createdAt");
CREATE INDEX "whatsapp_messages_phoneNumberId_createdAt_idx" ON "whatsapp_messages"("phoneNumberId", "createdAt");
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");
CREATE INDEX "whatsapp_messages_metaMessageId_idx" ON "whatsapp_messages"("metaMessageId");
CREATE INDEX "whatsapp_messages_referenceType_referenceId_idx" ON "whatsapp_messages"("referenceType", "referenceId");
CREATE INDEX "whatsapp_message_events_messageId_occurredAt_idx" ON "whatsapp_message_events"("messageId", "occurredAt");
CREATE INDEX "whatsapp_message_events_occurredAt_idx" ON "whatsapp_message_events"("occurredAt");
CREATE UNIQUE INDEX "whatsapp_webhook_events_dedupeKey_key" ON "whatsapp_webhook_events"("dedupeKey");
CREATE INDEX "whatsapp_webhook_events_processingStatus_createdAt_idx" ON "whatsapp_webhook_events"("processingStatus", "createdAt");
CREATE INDEX "whatsapp_webhook_events_providerEventId_idx" ON "whatsapp_webhook_events"("providerEventId");

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "whatsapp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "whatsapp_phone_numbers_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "whatsapp_business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_whatsapp_senders" ADD CONSTRAINT "store_whatsapp_senders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_whatsapp_senders" ADD CONSTRAINT "store_whatsapp_senders_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_whatsapp_profiles" ADD CONSTRAINT "store_whatsapp_profiles_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_template_definitions" ADD CONSTRAINT "whatsapp_template_definitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_template_instances" ADD CONSTRAINT "whatsapp_template_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "whatsapp_template_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_template_instances" ADD CONSTRAINT "whatsapp_template_instances_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "whatsapp_business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_templateInstanceId_fkey" FOREIGN KEY ("templateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_events" ADD CONSTRAINT "whatsapp_message_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "whatsapp_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
