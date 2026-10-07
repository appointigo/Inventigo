# Stockiva Playwright E2E testing

## Architecture

Playwright runs Chromium against the real Next.js application. A wrapper validates `.env.e2e`, resets only a clearly named test database, applies the audited greenfield baseline, records the fixed historical migration ledger, deploys any later production migrations, seeds one fake tenant/store/owner/product plus payment accounts, starts Next.js on loopback, authenticates through the login UI, and reuses encrypted session cookies through Playwright storage state.

The P0 sale test performs the business action through the POS UI. It then reads the isolated database to verify Sale, SaleItem, SalePayment, FinancialTransaction, Customer, StockEntry and StockMovement state.

The E2E server uses `.next-e2e` so it can run without stopping a normal `next dev` process that uses `.next`.

## Migration isolation

The greenfield SQL and its fixed 50-migration manifest live under `e2e/baseline/` and are invoked only by the guarded E2E preparation scripts. Normal production deployment still runs `prisma migrate deploy` against `prisma/migrations/`; it does not discover or execute files under `e2e/baseline/`.

The manifest boundary is `20261007120000_add_return_idempotency`. Its entries are pinned by name and checksum and cannot absorb newly created migrations. A future migration remains unapplied in both paths: production applies it after the historical chain, while E2E records only the fixed baseline ledger and then applies the same future migration through `prisma migrate deploy`.

## One-time local configuration

1. Create a dedicated PostgreSQL database whose name contains `e2e` or `test`.
2. Copy `.env.e2e.example` to `.env.e2e`.
3. Set both `DATABASE_URL` and `E2E_DATABASE_URL` to exactly the same isolated database URL.
4. Set `E2E_DATABASE_NAME` to the exact database name.
5. Keep `E2E_ALLOW_DATABASE_RESET=true`, `NODE_ENV=test`, and the fake `.invalid` test email.
6. Do not add production OAuth, email or WhatsApp credentials.

The reset guard rejects missing consent, mismatched URLs, non-test database names, production markers, real email domains, external credentials, and non-loopback app URLs by default.

## Commands

```bash
npm install
npx playwright install chromium
npm run test:e2e:safety
npm run e2e:prepare
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

`test:e2e`, `test:e2e:headed`, and `test:e2e:ui` reset and reseed the isolated database before running. Do not use them against a database containing data you need.

## CI requirements

Provide CI-only values for `E2E_DATABASE_URL`, `DATABASE_URL`, `E2E_DATABASE_NAME`, `E2E_USER_PASSWORD`, and `AUTH_SECRET`. The database must be ephemeral or dedicated to the E2E job. Install Chromium with `npx playwright install --with-deps chromium`. Preserve `e2e/playwright-report` and `e2e/test-results` as failure artifacts.

No production deployment step is configured.

## External effects

The seed disables the tenant WhatsApp feature and automatic invoice delivery. The environment guard rejects Google OAuth and Resend credentials. Tests use reserved `.invalid` identities and never real phone/email recipients. Cron/webhook routes are not invoked by the initial suite.

## Test isolation

The initial suite runs with one worker because it shares a deterministic reset database. Future independent scenarios should create their own prefixed fixtures. Intentional full-business-cycle reconciliation tests may remain serial and must document their ordering.
