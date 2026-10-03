# Stockiva migration-history review — 2026-09-18

The existing worktree was preserved. This continuation changed no migration, schema, application code, application database data, or migration metadata. It generated the Prisma client in node_modules and created this review. The repair is not ready for migrate dev: replay succeeds, but the Prisma schema still differs from migration history and one migration remains pending.

## Original failure and baseline evidence

Original P3006: `20260424120000_add_customer_colors_budgets` executed `ALTER TABLE "sales" ADD COLUMN "customerId" TEXT;`, although `000_init` already created that column. The baseline also contains customers, colors, expense budgets, expense fields, indexes and foreign keys duplicated by the later migration.

Git evidence:
- `fd5ca71` (April 24, 12:50 +0530) introduced an empty `000_init` file.
- `43b2887` (April 24, 14:25 +0530) populated it with 955 lines, including the overlapping objects. Current baseline exactly matches that commit and the configured database checksum.
- `1864b71` (April 24, 15:03 +0530) introduced the later customer migration. Its original SQL overlaps the already populated baseline.
- No subsequent change to the populated baseline appears in available Git history. The configured database records baseline completion at 14:33 +0530 with zero applied steps, consistent with a baseline being marked applied, although metadata alone cannot establish the operator's intent.

Thus 000_init was changed from empty to populated before the customer migration was committed, not retroactively expanded after that later migration in available history. Restoring the empty file would remove creation of the entire initial schema, break replay, and mismatch the recorded baseline checksum. There is no earlier populated baseline without the customer objects available to restore.

## Checksum repair status and migration classification

All 27 database-recorded migrations have local files and exact SHA-256 matches. No failed or rolled-back entries were observed. This does not prove staging/production parity; only the currently configured Neon database was inspected.

| Migration | Classification and evidence |
| --- | --- |
| 000_init | Unchanged populated historical baseline; exact Git 43b2887 and DB match |
| 20260422000000_add_product_mrp | A: restored historical SQL; exact Git 31a0a1a and DB match |
| 20260424120000_add_customer_colors_budgets | C: modified applied migration from previous repair; no-op is not historical Git SQL |
| 20260903190000_add_whatsapp_campaign_queue | A: restored applied form proven by exact DB checksum; no exact Git version found |
| 20260906000000_item_negotiated_pricing | A: restored; exact Git 221a904 and DB match |
| 20260907000000_optimize_product_inventory_search | A: restored; exact Git 52d1272 and DB match |
| 20260912000000_add_purchases_foundation | A: restored; exact Git 119f178 and DB match |
| 20260912010000_enable_rare_thread_purchases | A: restored; exact Git 119f178 and DB match |
| 20260918090000_add_whatsapp_template_source | Existing staged new feature migration, already applied to configured DB; exact checksum match, now immutable |
| 20260918100000_add_whatsapp_campaign_delivery_statuses | B: genuinely new, pending forward migration |

The customer no-op was left untouched, not newly approved as immutable historical SQL. Its current checksum is `1091c1b38f3de74e05b23349d091920b398e704dd0d4a2df21b73eaad3a631c5`, matching the database. Git's original SQL (1864b71, also restored by bd0ec04) hashes to `4caad707d86a67cea9295a3901c75cfa7e9d98ee337aab218593ef4f97013d5f`. The reported prior checksum alignment is consistent with these observations, but no audit log of that update was available. The original stored pre-repair checksum cannot be recovered from the current row alone.

Restoring customer SQL alone would both recreate P3006 and mismatch current migration metadata. No further checksum edit is proposed or necessary for the current replay. A universally immutable history has not been established: review the April baseline/no-op exception and inspect separately authorized staging/production migration records before adopting it across environments. No migrate resolve or checksum modification was performed.

Queue SQL excludes SENT/DELIVERED/READ and exactly matches the stored applied checksum `16987bee08acf4296891ba02efb129b7bb8e7fd3b79629f1e13f091414ea58df`. The sole Git change commit 46c7338 already includes those values and has a different checksum. Therefore describe this as recovery of the applied SQL proven by checksum, not an exact Git restoration.

## New migrations and schema alignment

Delivery-status migration contains only three `ALTER TYPE "WhatsAppCampaignRecipientStatus" ADD VALUE IF NOT EXISTS` statements for SENT, DELIVERED and READ. It is needed because these values are present in schema.prisma and application expectations but absent from the applied queue SQL and live enum. Replay proves it succeeds after the recovered queue migration.

Template-source migration adds WhatsAppTemplateSource (SYSTEM/MERCHANT/META_IMPORTED), source with SYSTEM default, displayLabel and its source index. It belongs to the pre-existing staged WhatsApp feature work and is already applied; this continuation did not create or apply it.

Purchase alignment correctly maps PurchaseStatus, purchases, purchase_items and purchase_item_options, their columns, Decimal(12,2), date column, defaults, indexes and relations. Nullable supplier/category/size relations use SetNull; item hierarchy uses Cascade. No duplicate model was introduced. Purchase check constraints are present in SQL but are not represented by Prisma model syntax. Negotiated sale pricing fields and returnedLineAmount match restored SQL; barcode and stock indexes match the inventory migration. Full replay diff reports no purchase/pricing/stock/template-source mismatch.

## Validation results

- `npx prisma validate`: passed.
- `npx prisma generate`: passed, Prisma Client 7.5.0.
- `npx tsc --noEmit --incremental false`: passed. No project typecheck script exists.
- Complete replay: `prisma migrate deploy` applied all 28 migrations to a new, isolated PostgreSQL 18.3 database at 127.0.0.1:55487, successfully. No real application database was used for replay or shadow operations.
- Installed `prisma migrate diff --help` was inspected before comparison.
- `migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script --exit-code` used a separate disposable local shadow database and returned 2: differences remain.
- Live DB to schema diff: the same differences below, plus missing SENT/DELIVERED/READ.
- Full migration history to live DB diff: only SENT/DELIVERED/READ are absent live. Thus no unexpected live schema drift from recovered history was detected; pending delivery statuses explain the difference. This is separate from the unresolved mismatch between history and schema.prisma.
- Final `npx prisma migrate status`: exit 1; delivery-status migration remains pending. No missing-local warning. Checksums independently verified; migrate status alone does not prove no drift or modified history.
- `git diff --check` and `git diff --cached --check`: passed.

## Remaining schema differences (not applied)

Transforming replayed migration schema to schema.prisma would require:
1. ReferenceType: add EXCHANGE.
2. SaleStatus: add EXCHANGED.
3. StockMovementType: add EXCHANGE_IN.
4. StockMovementType: add EXCHANGE_OUT.
5. return_transaction_items.returnTransactionId foreign key: change ON DELETE CASCADE to RESTRICT (both retain ON UPDATE CASCADE).
6. Remove sales_transactionDate_idx.
7. Remove whatsapp_integrations_organizationId_provider_idx (the separate unique key remains).
8. Remove return_transactions.exchangedItems JSONB column.
9. Remove return_transactions.returnedItems JSONB column.
10. Make sales.roundOffAmount NOT NULL (migration-created column is nullable).
11. Add returnedProductId foreign key to products, ON DELETE SET NULL / ON UPDATE CASCADE.
12. Add returnedSizeId foreign key to sizes, ON DELETE SET NULL / ON UPDATE CASCADE.
13. Add newProductId foreign key to products, ON DELETE SET NULL / ON UPDATE CASCADE.
14. Add newSizeId foreign key to sizes, ON DELETE SET NULL / ON UPDATE CASCADE.

No catch-all migration was generated. In particular, dropping legacy return JSON columns would delete data and is outside the authorized preservation rules. Further work must decide whether to represent historical database objects in schema.prisma or add reviewed forward changes; inspect nulls, orphan references, enum usage and legacy JSON retention before any forward migration. Existing application code may rely on exchange enum values, so do not remove them merely to obtain an empty diff.

## Application regression and safety

Typecheck validates compatibility with the regenerated client. Full Products/Sales/Returns/Purchases/Stock/WhatsApp/campaign runtime regression was deferred because the user's prerequisite of healthy history/schema alignment has not been met. No production mutation or live application workflow was exercised. No migrate dev/reset, schema drop, migration resolve, database deployment, application-data modification or checksum update was performed. Only disposable local database contents were created by replay/shadow operations; that local PostgreSQL server was stopped afterward.

It is not yet safe to recommend migrate dev: schema/history diff is nonempty, delivery-status migration remains pending, and the customer no-op exception needs cross-environment review. Do not treat the status command's generic migrate-dev suggestion as approval.

## Recommended commit structure

1. Applied historical SQL recovery: MRP, queue, negotiated pricing, inventory indexes and purchases migrations, with evidence. Review/document the separate April baseline/customer no-op exception before including it; it is not a historical restoration.
2. Prisma purchase/pricing/index alignment and optional shadow URL configuration.
3. Pending WhatsApp recipient delivery statuses as a forward migration.
4. Keep the already staged merchant-template feature work and its already applied template-source migration together in its own feature commit. schema.prisma contains changes from both tracks, so stage hunks carefully.
5. This review can accompany the repair evidence. Resolve remaining schema mismatches separately after review; do not rewrite old SQL to eliminate them.

## Exact current changed files

Status below distinguishes index and working-tree changes. Migration paths shown as untracked directories contain migration.sql. All entries preceding this review were already present when continuation started.

```
M  prisma.config.ts
 M prisma/migrations/20260422000000_add_product_mrp/migration.sql
M  prisma/migrations/20260424120000_add_customer_colors_budgets/migration.sql
 M prisma/migrations/20260903190000_add_whatsapp_campaign_queue/migration.sql
A  prisma/migrations/20260918090000_add_whatsapp_template_source/migration.sql
MM prisma/schema.prisma
M  src/app/api/whatsapp/templates/[id]/route.ts
A  src/app/api/whatsapp/templates/create/route.ts
A  src/app/api/whatsapp/templates/creation-options/route.ts
M  src/app/api/whatsapp/templates/route.ts
M  src/modules/whatsapp/clients/HttpMetaWhatsAppClient.ts
M  src/modules/whatsapp/clients/MetaWhatsAppClient.ts
M  src/modules/whatsapp/components/WhatsAppCampaignsPage.tsx
M  src/modules/whatsapp/components/WhatsAppTemplatesPage.tsx
M  src/modules/whatsapp/components/WhatsAppTestMessagePage.tsx
M  src/modules/whatsapp/embeddedSignupClient.ts
M  src/modules/whatsapp/errors.ts
M  src/modules/whatsapp/server.ts
M  src/modules/whatsapp/services/WhatsAppCampaignExecutionService.ts
M  src/modules/whatsapp/services/WhatsAppCampaignService.ts
A  src/modules/whatsapp/services/WhatsAppMerchantTemplateService.ts
M  src/modules/whatsapp/services/WhatsAppTemplateReconciliationService.ts
M  src/modules/whatsapp/services/WhatsAppTemplateService.ts
M  src/modules/whatsapp/services/WhatsAppTestMessageService.ts
A  src/modules/whatsapp/templateCreationSchemas.ts
A  src/modules/whatsapp/templates/blueprints.ts
M  src/modules/whatsapp/templates/invoiceV1.ts
M  src/modules/whatsapp/testing/campaign.test.ts
A  src/modules/whatsapp/testing/merchantTemplate.test.ts
A  src/modules/whatsapp/testing/templateBlueprints.test.ts
A  src/modules/whatsapp/testing/templateCreationSchemas.test.ts
M  src/modules/whatsapp/testing/templateReconciliation.test.ts
?? prisma/migrations/20260906000000_item_negotiated_pricing/
?? prisma/migrations/20260907000000_optimize_product_inventory_search/
?? prisma/migrations/20260912000000_add_purchases_foundation/
?? prisma/migrations/20260912010000_enable_rare_thread_purchases/
?? prisma/migrations/20260918100000_add_whatsapp_campaign_delivery_statuses/
?? MIGRATION_REPAIR_REVIEW.md
```
