# Invoice PDF browser deployment

Stockiva uses one HTML invoice renderer and `puppeteer-core` in every environment.
Only browser discovery differs:

- Local development downloads the Chrome for Testing revision pinned by
  Puppeteer into `.cache/puppeteer` during `npm install`.
- Railway builds `Dockerfile`, downloads that same pinned browser into the
  image, installs its Linux libraries, and keeps the browser in the final image.
- Vercel skips the Chrome download and uses the bundled `@sparticuz/chromium`
  executable. The invoice routes explicitly use the Node.js runtime with a
  60-second maximum duration.

## Runtime requirements

- Node.js `>=22.17 <23`.
- Keep Vercel function memory at its current 2 GB default (or higher on plans
  that support it). Configure memory in the Vercel dashboard when Fluid
  Compute is enabled.
- `CRON_SECRET` must be configured so the durable WhatsApp worker can retry
  queued invoice deliveries via `/api/cron/whatsapp-campaigns`.
- `PUPPETEER_EXECUTABLE_PATH` is optional and is only intended for a custom
  self-hosted Chrome installation. It is not needed on local, Railway, or
  Vercel deployments.

Do not set `PUPPETEER_SKIP_DOWNLOAD=1` on Railway. The browser is intentionally
downloaded at image build time so a fresh runtime never depends on an ephemeral
cache or a manual server installation.

Railway automatically detects the root `Dockerfile`; no deprecated
`railway.json` config-as-code opt-in is required.
