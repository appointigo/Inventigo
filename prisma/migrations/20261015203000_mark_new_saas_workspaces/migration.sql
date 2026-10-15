-- Existing workspaces keep their legacy access classification. New self-service
-- workspaces explicitly require a verified SaaS subscription or access grant.
ALTER TABLE "organizations" ADD COLUMN "saasBillingRequired" BOOLEAN NOT NULL DEFAULT false;
