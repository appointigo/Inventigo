ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE 'QUEUED';
ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE 'RUNNING';
ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE 'PAUSED';
ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE 'FAILED';

ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'QUEUED';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'SENT';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'READ';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'FAILED';
ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE 'SKIPPED';

ALTER TABLE "whatsapp_campaigns"
  ADD COLUMN "launchedAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "whatsapp_campaign_recipients"
  ADD COLUMN "storeId" TEXT,
  ADD COLUMN "senderId" TEXT,
  ADD COLUMN "templateInstanceId" TEXT,
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "availableAt" TIMESTAMP(3),
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockToken" TEXT,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "whatsapp_messages" ADD COLUMN "campaignRecipientId" TEXT;

CREATE UNIQUE INDEX "whatsapp_campaign_recipients_jobId_key"
  ON "whatsapp_campaign_recipients"("jobId");
CREATE INDEX "whatsapp_campaign_recipients_status_availableAt_lockedAt_idx"
  ON "whatsapp_campaign_recipients"("status", "availableAt", "lockedAt");
CREATE INDEX "whatsapp_messages_campaignRecipientId_createdAt_idx"
  ON "whatsapp_messages"("campaignRecipientId", "createdAt");

ALTER TABLE "whatsapp_campaign_recipients"
  ADD CONSTRAINT "whatsapp_campaign_recipients_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_campaign_recipients"
  ADD CONSTRAINT "whatsapp_campaign_recipients_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "store_whatsapp_senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_campaign_recipients"
  ADD CONSTRAINT "whatsapp_campaign_recipients_templateInstanceId_fkey"
  FOREIGN KEY ("templateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_campaignRecipientId_fkey"
  FOREIGN KEY ("campaignRecipientId") REFERENCES "whatsapp_campaign_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
