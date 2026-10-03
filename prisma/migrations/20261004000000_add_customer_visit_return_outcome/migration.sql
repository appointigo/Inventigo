CREATE TYPE "VisitReturnOutcome" AS ENUM ('PURCHASED', 'DID_NOT_PURCHASE');

ALTER TABLE "customer_visits"
  ADD COLUMN "returnOutcome" "VisitReturnOutcome";
