ALTER TYPE "CustomerFollowUpType" ADD VALUE IF NOT EXISTS 'OTHER';
CREATE TYPE "CustomerFollowUpPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

ALTER TABLE "customer_follow_ups"
  ADD COLUMN "visitId" TEXT,
  ADD COLUMN "demandRequestId" TEXT,
  ADD COLUMN "priority" "CustomerFollowUpPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Customer follow-up',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "lastContactedAt" TIMESTAMP(3),
  ADD COLUMN "sourceReference" TEXT;

CREATE INDEX "customer_follow_ups_visitId_idx" ON "customer_follow_ups"("visitId");
CREATE INDEX "customer_follow_ups_demandRequestId_idx" ON "customer_follow_ups"("demandRequestId");
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "customer_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_demandRequestId_fkey" FOREIGN KEY ("demandRequestId") REFERENCES "demand_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_follow_ups" DROP CONSTRAINT "customer_follow_ups_orgId_fkey";
ALTER TABLE "customer_follow_ups" DROP CONSTRAINT "customer_follow_ups_customerId_fkey";
ALTER TABLE "customer_follow_ups" DROP CONSTRAINT "customer_follow_ups_storeId_fkey";
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
