const secret = process.env.CRON_SECRET;
const configuredBaseUrl = process.env.STOCKIVA_APP_URL;
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

if (!secret) throw new Error("CRON_SECRET_REQUIRED");
if (!configuredBaseUrl && !railwayDomain) throw new Error("STOCKIVA_APP_URL_REQUIRED");

const baseUrl = configuredBaseUrl || `https://${railwayDomain}`;
const endpoint = new URL("/api/cron/whatsapp-invoices", baseUrl);
console.info("[WhatsApp Invoice Trigger] request_started", {
  deploymentEnvironment: railwayDomain ? "railway" : "production",
  stage: "WORKER_TRIGGER",
});

const response = await fetch(endpoint, {
  method: "GET",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(55_000),
});
if (!response.ok) {
  console.warn("[WhatsApp Invoice Trigger] request_failed", {
    deploymentEnvironment: railwayDomain ? "railway" : "production",
    stage: "WORKER_TRIGGER",
    httpStatus: response.status,
  });
  process.exitCode = 1;
} else {
  const result = await response.json();
  console.info("[WhatsApp Invoice Trigger] request_completed", {
    deploymentEnvironment: railwayDomain ? "railway" : "production",
    stage: "WORKER_TRIGGER",
    httpStatus: response.status,
    invoices: result.invoices,
  });
}
