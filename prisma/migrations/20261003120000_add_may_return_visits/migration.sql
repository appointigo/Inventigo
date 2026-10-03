ALTER TYPE "VisitOutcome" ADD VALUE IF NOT EXISTS 'MAY_RETURN';

CREATE TYPE "ExpectedReturnPeriod" AS ENUM (
  'TOMORROW',
  'TWO_TO_THREE_DAYS',
  'WITHIN_A_WEEK',
  'NOT_SURE'
);

ALTER TABLE "customer_visits"
  ADD COLUMN "expectedReturnPeriod" "ExpectedReturnPeriod",
  ADD COLUMN "returnConfirmedAt" TIMESTAMP(3);

CREATE INDEX "customer_visits_storeId_outcome_returnConfirmedAt_idx"
  ON "customer_visits"("storeId", "outcome", "returnConfirmedAt");
