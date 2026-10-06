-- Only backfill the legacy JSON supplier reference when it resolves to a real
-- supplier in the same organization. Unknown or cross-tenant values are left
-- untouched rather than fabricating an association.
INSERT INTO "product_suppliers" (
  "id", "productId", "supplierId", "isDefault", "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  p."id",
  s."id",
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "products" p
JOIN "suppliers" s
  ON s."id" = p."attributes"->>'supplierId'
 AND s."orgId" = p."orgId"
WHERE NULLIF(p."attributes"->>'supplierId', '') IS NOT NULL
ON CONFLICT ("productId", "supplierId") DO UPDATE SET
  "isDefault" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
