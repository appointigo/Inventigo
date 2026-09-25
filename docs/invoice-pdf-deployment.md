# Invoice PDF and delivery worker deployment

Stockiva invoice attachments are rendered directly in Node.js with
`@react-pdf/renderer`. Invoice generation does not launch Chrome, load HTML, or
call an external PDF service. The renderer uses React PDF's built-in Helvetica
font and therefore has no runtime font download or font asset requirement.

The barcode PDF export still uses `puppeteer-core`. Keep the pinned browser,
`@sparticuz/chromium`, `.puppeteerrc.cjs`, the Docker Chrome libraries, and the
barcode route's output-file tracing until that separate feature is migrated.

## Runtime requirements

- Node.js `>=22.17 <23`.
- `DATABASE_URL` must be present at runtime, not during the Docker image build.
- WhatsApp/Meta credentials remain runtime-only variables.
- `CRON_SECRET` must be the same long random value on the web service and every
  scheduler that calls an authenticated cron route.
- `PUPPETEER_EXECUTABLE_PATH` is optional and is only intended for a custom
  self-hosted Chrome installation used by the barcode exporter.

## Vercel

`vercel.json` invokes `/api/cron/whatsapp-invoices` every minute. The route is
Node-only, validates Vercel's `Authorization: Bearer <CRON_SECRET>` header, and
awaits the durable database batch before returning. Invoice processing is kept
separate from campaign and automation processing so a failure in those workers
cannot starve the invoice queue.

## Railway

`next start` only serves HTTP requests; it does not execute `vercel.json` cron
configuration. Create a second Railway service from the same repository/image,
configure it as a cron service (recommended schedule: `*/5 * * * *`, Railway's
minimum supported interval; schedules run in UTC), and set its
start command to:

```bash
npm run whatsapp:invoices:worker
```

Give that cron service the same `CRON_SECRET` and set `STOCKIVA_APP_URL` to the
web service's HTTPS origin. As a fallback, a Railway variable reference may
expose the web service's `RAILWAY_PUBLIC_DOMAIN` to the cron service. The command
makes one authenticated request, waits for its result, and exits non-zero on an
HTTP failure. Do not run it as an unawaited task inside the web request that
creates a sale.

Before enabling the recurring schedule, verify the shared secret without
touching the queue:

```bash
curl -I -H "Authorization: Bearer $CRON_SECRET" \
  "$STOCKIVA_APP_URL/api/cron/whatsapp-invoices"
```

The expected response is `204`. This `HEAD` handler performs no database query
and cannot claim an invoice.

For a controlled one-record smoke test, keep the recurring cron service
disabled and temporarily set these variables on the web service:

```text
WHATSAPP_INVOICE_SMOKE_TEST_DELIVERY_ID=<exact reviewed delivery UUID>
WHATSAPP_INVOICE_SMOKE_TEST_RECIPIENT=<exact reviewed E.164 recipient>
```

First inspect the allowlisted record with an authenticated `GET` to
`/api/cron/whatsapp-invoices/<delivery-id>`. Only after reviewing that response
and obtaining explicit send authorization, submit:

```json
{
  "deliveryId": "<same delivery UUID>",
  "expectedReference": "<same invoice reference>",
  "confirmation": "SEND_SINGLE_WHATSAPP_INVOICE"
}
```

to the same URL with `POST` and the bearer secret. The route rejects any other
delivery, recipient, reference, previously claimed record, provider message,
media upload, provider-error history, or revoked/missing transactional consent.
Remove both smoke-test variables after the test.

Railway automatically detects the root `Dockerfile`; no deprecated
`railway.json` opt-in is required. The web service keeps `npm run start` as its
start command. Because barcode export still needs Chrome, do not set
`PUPPETEER_SKIP_DOWNLOAD=1` on Railway.
