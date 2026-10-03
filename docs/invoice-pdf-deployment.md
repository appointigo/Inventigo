# Invoice PDF and immediate delivery deployment

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

After a sale or eligible exchange commits, its specific delivery record is
dispatched immediately. Checkout waits up to eight seconds by default for a
persisted result. If PDF generation or Meta takes longer, Next.js `after()`
keeps that same in-flight attempt alive after the HTTP response through
Vercel's supported `waitUntil` integration. Set
`WHATSAPP_INVOICE_INITIAL_WAIT_MS` to a value from `0` through `15000` to tune
the response wait; this does not change Meta's own request timeout.

`vercel.json` may still invoke `/api/cron/whatsapp-invoices` for interruption
recovery, but scheduled execution is not part of ordinary invoice delivery.
The route remains Node-only, validates Vercel's
`Authorization: Bearer <CRON_SECRET>` header, and processes the durable queue.

## Railway

`next start` supports Next.js `after()`, so the Railway web service performs the
same immediate, single-record post-commit dispatch as localhost and Vercel. A
second Railway cron service is optional interruption recovery; it is not needed
for ordinary invoice delivery. If recovery is required, configure a cron
service from the same repository/image (recommended schedule: `*/5 * * * *`,
Railway's minimum supported interval; schedules run in UTC), and set its start
command to:

```bash
npm run whatsapp:invoices:worker
```

Give that cron service the same `CRON_SECRET` and set `STOCKIVA_APP_URL` to the
web service's HTTPS origin. As a fallback, a Railway variable reference may
expose the web service's `RAILWAY_PUBLIC_DOMAIN` to the cron service. The command
makes one authenticated request, waits for its result, and exits non-zero on an
HTTP failure. Normal checkout uses the platform-supported post-response
lifecycle rather than an unawaited promise.

Without this optional scheduler or another persistent worker, a hard process
termination after the database commit but before `after()` finishes can leave a
claimed delivery awaiting manual retry/reconciliation. The durable claim still
prevents an automatic duplicate after an uncertain Meta submission.

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
