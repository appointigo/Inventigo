CREATE TYPE "WhatsAppConversationRoutingStatus" AS ENUM ('RESOLVED', 'UNRESOLVED');
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "whatsapp_webhook_events" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN "conversationId" TEXT;

CREATE TABLE "whatsapp_conversations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "contactId" TEXT,
  "storeId" TEXT,
  "externalPhone" TEXT NOT NULL,
  "routingStatus" "WhatsAppConversationRoutingStatus" NOT NULL DEFAULT 'UNRESOLVED',
  "unresolvedReason" TEXT,
  "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_webhook_events_organizationId_createdAt_idx" ON "whatsapp_webhook_events"("organizationId", "createdAt");
CREATE INDEX "whatsapp_messages_conversationId_createdAt_idx" ON "whatsapp_messages"("conversationId", "createdAt");
CREATE INDEX "whatsapp_conversations_organizationId_lastMessageAt_idx" ON "whatsapp_conversations"("organizationId", "lastMessageAt");
CREATE INDEX "whatsapp_conversations_phoneNumberId_externalPhone_status_idx" ON "whatsapp_conversations"("phoneNumberId", "externalPhone", "status");
CREATE INDEX "whatsapp_conversations_storeId_lastMessageAt_idx" ON "whatsapp_conversations"("storeId", "lastMessageAt");

ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
