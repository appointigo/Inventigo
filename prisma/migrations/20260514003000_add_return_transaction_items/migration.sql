-- Create return_transaction_items table (relational replacement for the old
-- returnedItems / exchangedItems JSONB columns on return_transactions).
-- Uses IF NOT EXISTS so it is safe to re-run on environments where the table
-- was already created via `prisma db push`.

CREATE TABLE IF NOT EXISTS "return_transaction_items" (
    "id"                  TEXT         NOT NULL,
    "returnTransactionId" TEXT         NOT NULL,
    "returnedProductId"   TEXT,
    "returnedSizeId"      TEXT,
    "returnedQuantity"    INTEGER      NOT NULL,
    "returnedUnitPrice"   DECIMAL(10,2) NOT NULL,
    "newProductId"        TEXT,
    "newSizeId"           TEXT,
    "newQuantity"         INTEGER,
    "newUnitPrice"        DECIMAL(10,2),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_transaction_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "return_transaction_items_returnTransactionId_idx"
    ON "return_transaction_items"("returnTransactionId");
CREATE INDEX IF NOT EXISTS "return_transaction_items_returnedProductId_idx"
    ON "return_transaction_items"("returnedProductId");
CREATE INDEX IF NOT EXISTS "return_transaction_items_newProductId_idx"
    ON "return_transaction_items"("newProductId");

-- Foreign key (returnTransaction)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'return_transaction_items_returnTransactionId_fkey'
  ) THEN
    ALTER TABLE "return_transaction_items"
      ADD CONSTRAINT "return_transaction_items_returnTransactionId_fkey"
      FOREIGN KEY ("returnTransactionId")
      REFERENCES "return_transactions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Backfill rows from the old JSONB columns (returnedItems / exchangedItems)
-- that were stored on the return_transactions table before this migration.
-- The JSONB columns still exist in the database even though Prisma no longer
-- maps them; we read them via raw SQL only during this migration.
DO $$
DECLARE
  has_returned_col boolean;
  has_exchanged_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name   = 'return_transactions'
      AND column_name  = 'returnedItems'
  ) INTO has_returned_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name   = 'return_transactions'
      AND column_name  = 'exchangedItems'
  ) INTO has_exchanged_col;

  -- ── Migrate returnedItems ─────────────────────────────────────────────────
  IF has_returned_col THEN
    INSERT INTO "return_transaction_items" (
        "id",
        "returnTransactionId",
        "returnedProductId",
        "returnedSizeId",
        "returnedQuantity",
        "returnedUnitPrice",
        "createdAt"
    )
    SELECT
        gen_random_uuid()::text,
        rt.id,
        (item->>'productId')::text,
        (item->>'sizeId')::text,
        GREATEST(COALESCE((item->>'quantity')::int, 1), 1),
        CASE
          WHEN COALESCE((item->>'quantity')::int, 1) > 0
            THEN ROUND(
                   COALESCE((item->>'total')::numeric, 0) /
                   COALESCE((item->>'quantity')::int, 1),
                   2
                 )
          ELSE 0
        END,
        rt."createdAt"
    FROM "return_transactions" rt,
         jsonb_array_elements(rt."returnedItems") AS item
    WHERE jsonb_typeof(rt."returnedItems") = 'array'
      AND rt."returnedItems" <> '[]'::jsonb
      AND (item->>'productId') IS NOT NULL
      -- Only for rows that have no relational items yet
      AND NOT EXISTS (
            SELECT 1 FROM "return_transaction_items" rti
            WHERE rti."returnTransactionId" = rt.id
          );
  END IF;

  -- ── Migrate exchangedItems ────────────────────────────────────────────────
  IF has_exchanged_col THEN
    INSERT INTO "return_transaction_items" (
        "id",
        "returnTransactionId",
        "returnedProductId",
        "returnedSizeId",
        "returnedQuantity",
        "returnedUnitPrice",
        "newProductId",
        "newSizeId",
        "newQuantity",
        "newUnitPrice",
        "createdAt"
    )
    SELECT
        gen_random_uuid()::text,
        rt.id,
        NULL,                                    -- no returned product for pure exchange-out rows
        NULL,
        0,
        0,
        (item->>'productId')::text,
        (item->>'sizeId')::text,
        GREATEST(COALESCE((item->>'quantity')::int, 1), 1),
        CASE
          WHEN COALESCE((item->>'quantity')::int, 1) > 0
            THEN ROUND(
                   COALESCE((item->>'total')::numeric, 0) /
                   COALESCE((item->>'quantity')::int, 1),
                   2
                 )
          ELSE 0
        END,
        rt."createdAt"
    FROM "return_transactions" rt,
         jsonb_array_elements(rt."exchangedItems") AS item
    WHERE jsonb_typeof(rt."exchangedItems") = 'array'
      AND rt."exchangedItems" <> '[]'::jsonb
      AND (item->>'productId') IS NOT NULL
      -- Only for rows that have no relational items yet (skip rows already
      -- handled by the returnedItems block above, since those now have items)
      AND NOT EXISTS (
            SELECT 1 FROM "return_transaction_items" rti
            WHERE rti."returnTransactionId" = rt.id
              AND rti."newProductId" = (item->>'productId')::text
          );
  END IF;
END$$;
