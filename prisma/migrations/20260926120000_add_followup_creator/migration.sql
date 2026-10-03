ALTER TABLE "customer_follow_ups" ADD COLUMN "createdBy" TEXT;

UPDATE "customer_follow_ups" follow_up
SET "createdBy" = COALESCE(
  follow_up."assignedUserId",
  (SELECT "id" FROM "users" WHERE "orgId" = follow_up."orgId" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "customer_follow_ups" WHERE "createdBy" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill customer_follow_ups.createdBy because an organization has no user';
  END IF;
END $$;

ALTER TABLE "customer_follow_ups" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "customer_follow_ups_createdBy_idx" ON "customer_follow_ups"("createdBy");
