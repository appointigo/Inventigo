ALTER TABLE "whatsapp_messages" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN "dispatchClaimedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "whatsapp_messages_idempotencyKey_key" ON "whatsapp_messages"("idempotencyKey");
