import { config as loadEnv } from "dotenv";
import path from "node:path";

const forbidden = /(prod|production|live|primary|master)/i;
const testMarker = /(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i;
const externalEffectVariables = [
  "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "CRON_SECRET",
  "DEMO_REQUEST_RECIPIENT",
  "DEMO_REQUEST_SENDER",
  "WHATSAPP_INVOICE_SMOKE_TEST_DELIVERY_ID",
  "WHATSAPP_INVOICE_SMOKE_TEST_RECIPIENT",
];

export function loadE2EEnvironment(root = process.cwd()) {
  const envPath = path.join(root, ".env.e2e");
  const result = loadEnv({ path: envPath, override: true });
  if (result.error) {
    throw new Error(`Missing ${envPath}. Copy .env.e2e.example and use an isolated database.`);
  }
  return envPath;
}

export function assertSafeE2EEnvironment(env = process.env) {
  const failures = [];
  if (env.NODE_ENV !== "test") failures.push("NODE_ENV must equal test");
  if (env.E2E_ALLOW_DATABASE_RESET !== "true") {
    failures.push("E2E_ALLOW_DATABASE_RESET must explicitly equal true");
  }
  if (!env.DATABASE_URL || !env.E2E_DATABASE_URL) {
    failures.push("DATABASE_URL and E2E_DATABASE_URL are required");
  }
  if (env.DATABASE_URL !== env.E2E_DATABASE_URL) {
    failures.push("DATABASE_URL must exactly equal E2E_DATABASE_URL");
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(env.DATABASE_URL ?? "");
  } catch {
    failures.push("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (databaseUrl) {
    if (!databaseUrl.protocol.startsWith("postgres")) {
      failures.push("E2E database must use PostgreSQL");
    }
    const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
    if (!databaseName || !testMarker.test(databaseName)) {
      failures.push("Database name must contain e2e or test");
    }
    if (forbidden.test(databaseName) || forbidden.test(databaseUrl.hostname)) {
      failures.push("Database host/name contains a production marker");
    }
    if (!env.E2E_DATABASE_NAME || databaseName !== env.E2E_DATABASE_NAME) {
      failures.push("E2E_DATABASE_NAME must exactly match the database URL name");
    }
  }

  let baseUrl;
  try {
    baseUrl = new URL(env.E2E_BASE_URL ?? "");
  } catch {
    failures.push("E2E_BASE_URL must be a valid URL");
  }
  if (
    baseUrl &&
    !["127.0.0.1", "localhost", "::1"].includes(baseUrl.hostname) &&
    env.E2E_ALLOW_REMOTE_APP !== "true"
  ) {
    failures.push("E2E_BASE_URL must be loopback unless E2E_ALLOW_REMOTE_APP=true");
  }
  if (!env.E2E_USER_EMAIL?.endsWith(".invalid")) {
    failures.push("E2E_USER_EMAIL must use the reserved .invalid domain");
  }
  if (!env.E2E_USER_PASSWORD || env.E2E_USER_PASSWORD.length < 12) {
    failures.push("E2E_USER_PASSWORD must contain at least 12 characters");
  }
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
    failures.push("AUTH_SECRET must be an explicit E2E-only value of at least 32 characters");
  }
  const configuredExternalEffects = externalEffectVariables.filter((key) => env[key]);
  if (configuredExternalEffects.length) {
    failures.push(
      `External delivery/cron credentials must be absent in E2E: ${configuredExternalEffects.join(", ")}`,
    );
  }

  if (failures.length) {
    throw new Error(
      `REFUSING E2E DATABASE OPERATION:\n- ${failures.join("\n- ")}\nNo database changes were made.`
    );
  }
}
