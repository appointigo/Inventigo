CREATE TYPE "WhatsAppConsentPurpose" AS ENUM ('TRANSACTIONAL', 'MARKETING');
CREATE TYPE "WhatsAppConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'PENDING');

CREATE TABLE "whatsapp_contacts" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "normalizedPhone" TEXT NOT NULL,
  "displayPhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "whatsapp_contact_stores" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_contact_stores_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "whatsapp_consents" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "purpose" "WhatsAppConsentPurpose" NOT NULL,
  "status" "WhatsAppConsentStatus" NOT NULL DEFAULT 'PENDING',
  "source" TEXT,
  "evidence" JSONB,
  "grantedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_consents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_contacts_customerId_key" ON "whatsapp_contacts"("customerId");
CREATE UNIQUE INDEX "whatsapp_contacts_organizationId_normalizedPhone_key" ON "whatsapp_contacts"("organizationId", "normalizedPhone");
CREATE INDEX "whatsapp_contacts_organizationId_createdAt_idx" ON "whatsapp_contacts"("organizationId", "createdAt");
CREATE UNIQUE INDEX "whatsapp_contact_stores_contactId_storeId_key" ON "whatsapp_contact_stores"("contactId", "storeId");
CREATE INDEX "whatsapp_contact_stores_storeId_idx" ON "whatsapp_contact_stores"("storeId");
CREATE UNIQUE INDEX "whatsapp_consents_contactId_purpose_key" ON "whatsapp_consents"("contactId", "purpose");
CREATE INDEX "whatsapp_consents_status_purpose_idx" ON "whatsapp_consents"("status", "purpose");
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_contact_stores" ADD CONSTRAINT "whatsapp_contact_stores_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_contact_stores" ADD CONSTRAINT "whatsapp_contact_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_consents" ADD CONSTRAINT "whatsapp_consents_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
