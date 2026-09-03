CREATE TABLE "whatsapp_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META',
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_credentials_organizationId_provider_idx"
ON "whatsapp_credentials"("organizationId", "provider");

CREATE UNIQUE INDEX "whatsapp_integrations_organizationId_provider_key"
ON "whatsapp_integrations"("organizationId", "provider");

ALTER TABLE "whatsapp_credentials"
ADD CONSTRAINT "whatsapp_credentials_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
