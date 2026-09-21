-- Enable the centralized Purchases capability only for the existing Rare Thread organization.
-- Runtime authorization uses orgId; the slug is used once here to select rollout data.
INSERT INTO "public"."feature_flags" (
    "id",
    "orgId",
    "key",
    "value",
    "scope",
    "description",
    "createdAt",
    "updatedAt"
)
SELECT
    '9e7fdd14-72a5-4e77-a6dc-1ab737c515b3',
    "id",
    'purchases',
    TRUE,
    'ORGANIZATION',
    'Purchases rollout for Rare Thread',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "public"."organizations"
WHERE "slug" = 'rare-thread'
ON CONFLICT ("orgId", "key") DO UPDATE SET
    "value" = TRUE,
    "scope" = 'ORGANIZATION',
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;
