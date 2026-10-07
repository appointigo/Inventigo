import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.e2e", override: true });

const databaseURL = process.env.DATABASE_URL;
const e2eDatabaseURL = process.env.E2E_DATABASE_URL;
const expectedDatabaseName = process.env.E2E_DATABASE_NAME;

if (process.env.NODE_ENV !== "test") {
  throw new Error("Refusing Playwright run: NODE_ENV must be test");
}
if (process.env.E2E_ALLOW_DATABASE_RESET !== "true") {
  throw new Error("Refusing Playwright run: E2E_ALLOW_DATABASE_RESET must be true");
}
if (!databaseURL || databaseURL !== e2eDatabaseURL) {
  throw new Error("Refusing Playwright run: DATABASE_URL must exactly match E2E_DATABASE_URL");
}

const parsedDatabaseURL = new URL(databaseURL);
const databaseName = decodeURIComponent(parsedDatabaseURL.pathname.slice(1));
if (
  !parsedDatabaseURL.protocol.startsWith("postgres") ||
  !expectedDatabaseName ||
  databaseName !== expectedDatabaseName ||
  !/(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i.test(databaseName) ||
  /(?:prod|production|live)/i.test(`${parsedDatabaseURL.hostname}/${databaseName}`)
) {
  throw new Error(
    "Refusing Playwright run: database must be the explicitly named isolated test database"
  );
}
if (!process.env.E2E_USER_EMAIL?.endsWith(".invalid")) {
  throw new Error("Refusing Playwright run: E2E user email must use the reserved .invalid domain");
}
if (!process.env.E2E_USER_PASSWORD || process.env.E2E_USER_PASSWORD.length < 12) {
  throw new Error("Refusing Playwright run: E2E user password is missing or too short");
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("Refusing Playwright run: an explicit E2E-only AUTH_SECRET is required");
}
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
if (externalEffectVariables.some((key) => process.env[key])) {
  throw new Error("Refusing Playwright run: external delivery/cron credentials must be absent");
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3002";
const parsedBaseURL = new URL(baseURL);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedBaseURL.hostname) &&
  process.env.E2E_ALLOW_REMOTE_APP !== "true"
) {
  throw new Error("Refusing to run Playwright against a non-loopback application URL");
}

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["html", { outputFolder: "e2e/playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3002",
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "true",
    timeout: 120_000,
    env: {
      ...process.env,
      ...Object.fromEntries(externalEffectVariables.map((key) => [key, ""])),
      NODE_ENV: "test",
      E2E_NEXT_DIST_DIR: ".next-e2e",
      E2E_DEMO_DELIVERY_ADAPTER: "capture",
      E2E_DEMO_DELIVERY_CAPTURE_PATH: "e2e/test-results/demo-request-deliveries.jsonl",
      E2E_DEMO_DELIVERY_PLAN: "success,failure",
      // Fixed local-only credential for the sole non-WhatsApp cron. The outer
      // safety gate still rejects CRON_SECRET from .env.e2e or the shell.
      CRON_SECRET: "stockiva-e2e-reorder-secret",
    },
  },
});
