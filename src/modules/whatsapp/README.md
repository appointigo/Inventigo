# WhatsApp module

## Meta platform configuration (P07)

The server transport defaults to the verified Graph API version `v26.0`. Set
`META_GRAPH_API_VERSION` to override it during a planned version upgrade.
Production onboarding also requires `META_APP_ID`, `META_APP_SECRET`,
`META_EMBEDDED_SIGNUP_CONFIG_ID`, and a base64-encoded 32-byte
`WHATSAPP_CREDENTIAL_ENCRYPTION_KEY`. `META_GRAPH_TIMEOUT_MS` is optional and
defaults to 10 seconds. None of these values is tenant-specific.

Tenant access tokens are encrypted with AES-256-GCM in
`whatsapp_credentials`; integrations retain only a tenant-scoped credential
reference. Tokens, app secrets, authorization codes, and registration PINs are
never returned by the completion endpoint or included in normalized errors.

The P07 backend exposes two OWNER/ADMIN-only endpoints:

- `POST /api/whatsapp/embedded-signup/session` creates a ten-minute, HttpOnly
  CSRF state and returns only browser-safe app/config metadata.
- `POST /api/whatsapp/embedded-signup/complete` accepts the one-time code,
  state, optional WABA selection, and optional six-digit registration PIN. It
  verifies token ownership, discovers granted WABAs and phone numbers,
  subscribes the app, and idempotently synchronizes tenant records.

No line-of-credit discovery, sharing, or attachment endpoint is implemented.
Each merchant remains responsible for its Meta billing arrangement.

## Embedded Signup UI (P08)

The Setup page loads Meta's JavaScript SDK only after an OWNER or ADMIN starts
the flow. It launches the configured Facebook Login for Business Embedded
Signup v4 flow with an authorization-code response; no Meta login screen is
reproduced inside Stockiva. Completion/cancellation events are accepted only
from `facebook.com` origins. After backend exchange, the page renders persisted
WABAs and phone numbers from `/api/whatsapp/status` and can request an explicit
tenant-scoped refresh through `POST /api/whatsapp/sync`.

## Development/test tenant bootstrap

The bootstrap is an explicit database-only command. It never creates Meta assets
and is not called by application startup or sender resolution.

Run it only with `NODE_ENV=development` or `NODE_ENV=test` and explicitly set:

- `P05_WHATSAPP_BOOTSTRAP_ENABLED=true`
- `P05_TEST_ORGANIZATION_ID`
- `P05_TEST_STORE_ID`
- `P05_CREDENTIAL_REF` (a secure credential handle, never a plaintext token)
- `P05_META_WABA_ID`
- `P05_META_PHONE_NUMBER_ID`
- `P05_DISPLAY_PHONE_NUMBER`

Optional sender settings are `P05_SENDER_PURPOSE`, `P05_SENDER_PRIORITY`, and
`P05_SENDER_IS_DEFAULT`. Optional WABA/phone descriptive fields use the `P05_`
prefix documented by the configuration loader.

An already-existing Meta template may be mapped only when all template settings
are supplied and `P05_META_TEMPLATE_CONFIRMED_APPROVED=true`. The command does
not submit, create, or approve a template at Meta.

```sh
npm run whatsapp:bootstrap:test-tenant
```

Rerunning the command reconciles the same integration, WABA, phone, sender
mapping, definition, and instance. It rejects a Store outside the configured
Organization and rejects a WABA, phone, or Meta template ID already owned by a
different tenant.

## Live smoke test after P07/P08

Once the verified Meta transport and protected send endpoint exist:

1. Bootstrap the explicitly identified test Organization.
2. Authenticate as a user in that Organization and selected Store.
3. Send one approved utility test template to an opted-in test recipient.
4. Confirm a `WhatsAppMessage` is created as `QUEUED` before transport.
5. Confirm Meta acceptance stores the returned provider message ID and changes
   the message to `SUBMITTED`.
6. Process the signed status webhook and confirm lifecycle events/status update.
7. Repeat from an unconfigured Organization and confirm it receives
   `NO_WHATSAPP_SENDER_CONFIGURED` or `WHATSAPP_NOT_CONNECTED` without invoking
   Meta.

## Meta webhook

Configure the Meta App callback as `/api/whatsapp/webhook` and set
`META_WEBHOOK_VERIFY_TOKEN` to a server-only, high-entropy value. Meta's GET
challenge must use that exact value. POST deliveries are accepted only when
`X-Hub-Signature-256` validates against `META_APP_SECRET`; neither secret is
stored with webhook payloads or returned to clients.

Status and inbound-message envelopes are persisted before processing. Duplicate deliveries are
deduplicated, failed or stale processing claims can be retried, and message
history retains out-of-order events without regressing aggregate state.

Inbound routing uses reply context, recent outbound context, and the intersection
of contact membership with receiving-number Store mappings. A receiving number
alone is never considered enough evidence; ambiguous messages remain unresolved.

## Campaign queue

Campaign delivery uses PostgreSQL through Prisma as a durable leased queue. A
launch performs only bulk state transitions; the protected
`/api/cron/whatsapp-campaigns` worker then claims at most 10 recipients per
invocation and sends at concurrency 2 through `CommunicationService`. Job IDs
are deterministic per campaign recipient. Five attempts use exponential
backoff starting at 30 seconds, and abandoned five-minute leases are reclaimed.

Set a high-entropy `CRON_SECRET` in Vercel. The checked-in every-minute schedule
requires Vercel Pro or Enterprise; Vercel Hobby only supports daily cron jobs.
The queue remains provider-neutral, so a future scheduler can call the same
worker service without changing campaign or messaging code.

## Automation engine

Active automation rules consume `SALE_COMPLETED`, `PAYMENT_DUE`, and
`CUSTOMER_INACTIVE` events. Each rule/event pair has one idempotent execution.
Scheduled payment and inactivity discovery is bounded and runs through the
existing protected WhatsApp cron worker. Executions record condition, consent,
readiness, transport, and terminal failure outcomes; all outbound actions use
`CommunicationService` rather than calling Meta directly.

## Production release checklist

Required application settings are `DATABASE_URL`, the deployment's authentication
secret/configuration, `WHATSAPP_ENABLED=true`, `META_APP_ID`, `META_APP_SECRET`,
`META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`,
`WHATSAPP_CREDENTIAL_ENCRYPTION_KEY`, and `CRON_SECRET`.
`META_GRAPH_API_VERSION` and `META_GRAPH_TIMEOUT_MS` are optional controlled
overrides. Do not configure tenant WABA IDs, phone-number IDs, or access tokens as
environment variables. The old `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_URL`, `WHATSAPP_PROVIDER`, and
`WHATSAPP_TEST_MODE` names are unsupported and should be removed from deployment
configuration.

Meta App configuration must use the deployed HTTPS Embedded Signup origin and
redirect flow, the `/api/whatsapp/webhook` callback, the matching verify token,
the approved Embedded Signup configuration ID, and the permissions/app-review
access documented for the configured P07 Meta contract. Subscribe the App to each
connected WABA. Never attach a Stockiva credit line.

Deployment order:

1. Back up the PostgreSQL database and verify all required secrets in the target.
2. Apply Prisma migrations with `npx prisma migrate deploy` before routing traffic
   to the new build.
3. Deploy the production build and confirm the webhook and cron routes use the
   Node.js runtime.
4. Connect or sync one explicit test tenant, verify readiness, send one consented
   test message, process its signed webhook, and inspect Activity and Health.
5. Enable scheduled workers and then expand tenant availability.

Rollback uses the previous application build while retaining the additive schema.
Disable `WHATSAPP_ENABLED` and the WhatsApp cron during an incident. Do not roll
back the database by dropping WhatsApp tables or columns; restore from the
pre-deploy backup only for a confirmed data-integrity incident. Messages with a
persisted dispatch claim but no Meta message ID require operator reconciliation
before retry, because automatically reclaiming that narrow failure window could
duplicate a customer message.

Monitor webhook authentication failures, webhook age and processing failures,
Meta auth/rate-limit/timeout error rates, WABA/phone/template status, queue depth
and oldest available job, abandoned leases, campaign/automation terminal failure
counts, last successful send, last asset sync, and unresolved inbound-conversation
volume. Alert on cron authentication failures and repeated worker 5xx responses;
logs must contain identifiers and normalized error codes only, never tokens,
authorization codes, registration PINs, app secrets, or raw diagnostic payloads.
