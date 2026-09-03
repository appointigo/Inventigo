CREATE UNIQUE INDEX "store_whatsapp_senders_one_active_default_per_purpose"
ON "store_whatsapp_senders"("storeId", "purpose")
WHERE "isDefault" = true AND "isActive" = true;
