-- Add new referenceNumber field to ReturnTransaction
ALTER TABLE "return_transactions" ADD COLUMN "referenceNumber" text;

-- Backfill existing rows with generated reference numbers.
-- Format: RET-YYYYMMDD-{STORECODE}-{SEQUENCE}
WITH ordered AS (
  SELECT
    rt.id,
    rt."createdAt" AS created_at,
    s.code AS store_code,
    ROW_NUMBER() OVER (
      PARTITION BY rt."storeId", DATE_TRUNC('day', rt."createdAt")
      ORDER BY rt."createdAt", rt.id
    ) AS seq
  FROM "return_transactions" rt
  JOIN "stores" s ON s.id = rt."storeId"
  WHERE rt."referenceNumber" IS NULL
)
UPDATE "return_transactions" rt
SET "referenceNumber" = CONCAT(
    'RET-',
    TO_CHAR(o.created_at, 'YYYYMMDD'),
    '-',
    SUBSTRING(UPPER(REGEXP_REPLACE(o.store_code, '-', '')) FROM 1 FOR 6),
    '-',
    LPAD(o.seq::text, 4, '0')
  )
FROM ordered o
WHERE rt.id = o.id;

ALTER TABLE "return_transactions" ALTER COLUMN "referenceNumber" SET NOT NULL;
CREATE UNIQUE INDEX "return_transactions_referenceNumber_key" ON "return_transactions"("referenceNumber");
