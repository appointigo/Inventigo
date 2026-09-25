# Invoice Management deployment

Invoice Management adds store-scoped PDF presentation settings, immutable policy versions, sale/exchange configuration snapshots, and separate default Meta template references for sales and exchanges.

## Deployment order

1. Back up the target database using the normal operational process.
2. Apply committed migrations with `npx prisma migrate deploy`.
3. Deploy the application using the existing Node.js runtime configuration.
4. As an Owner or Admin, open **Settings → Invoices** for each Store.
5. Select an approved Utility template with a `DOCUMENT` header for each transaction type that should support WhatsApp delivery.
6. Enable **WhatsApp invoice by default** only after the sale template is available.
7. Perform a mocked or designated test-tenant verification before enabling customer traffic.

No new environment variables, cron job, or scheduled function are required. Existing immediate post-commit dispatch remains the ordinary delivery path. The existing invoice worker/cron remains optional recovery infrastructure and must not be used to activate historical queued records without a separate operational decision.

## Settings API behavior

`PUT /api/invoice-management?storeId=<store-id>` is a merge update for the supplied Invoice Management fields. Omitted fields retain their current values; explicit `false`, `null`, and empty policy text remain intentional updates. This allows the four settings tabs to be saved independently without clearing configuration owned by another tab. Validation failures include Zod issue paths and field-specific errors.

## Data behavior

- Existing Stores default to the Classic design with automatic WhatsApp delivery disabled until settings are saved.
- Existing sales and return transactions are not backfilled or changed. Records without a snapshot render with the Classic fallback.
- New sales and exchanges store the selected design version and active policy content as JSON, plus an immutable policy-version reference.
- Changing a policy creates a new version; it does not mutate previously issued invoice content.
- Default message templates remain references to the existing Meta template library. The settings screen does not edit approved templates.

## Rollback

Application rollback is safe while the additive database migration remains applied. Older application versions ignore the new nullable columns and tables. Do not roll the migration back after new invoice snapshots have been written unless a separate data-retention plan has been approved.
