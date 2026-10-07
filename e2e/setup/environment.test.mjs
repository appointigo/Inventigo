import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeE2EEnvironment } from "./environment.mjs";

const safe = {
  NODE_ENV: "test",
  E2E_ALLOW_DATABASE_RESET: "true",
  E2E_DATABASE_NAME: "stockiva_e2e",
  E2E_DATABASE_URL: "postgresql://e2e:e2e@127.0.0.1:5432/stockiva_e2e",
  DATABASE_URL: "postgresql://e2e:e2e@127.0.0.1:5432/stockiva_e2e",
  E2E_BASE_URL: "http://127.0.0.1:3002",
  E2E_USER_EMAIL: "owner@stockiva.invalid",
  E2E_USER_PASSWORD: "long-e2e-password",
  AUTH_SECRET: "e2e-auth-secret-that-is-at-least-32-characters",
};

test("accepts an explicitly isolated local E2E database", () => {
  assert.doesNotThrow(() => assertSafeE2EEnvironment(safe));
});

for (const [name, overrides] of [
  ["production node environment", { NODE_ENV: "production" }],
  ["missing reset consent", { E2E_ALLOW_DATABASE_RESET: "false" }],
  ["different database URLs", { DATABASE_URL: "postgresql://x:x@localhost/stockiva_dev" }],
  ["production database marker", { E2E_DATABASE_NAME: "stockiva_production", DATABASE_URL: "postgresql://x:x@localhost/stockiva_production", E2E_DATABASE_URL: "postgresql://x:x@localhost/stockiva_production" }],
  ["non-test database name", { E2E_DATABASE_NAME: "stockiva_dev", DATABASE_URL: "postgresql://x:x@localhost/stockiva_dev", E2E_DATABASE_URL: "postgresql://x:x@localhost/stockiva_dev" }],
  ["real email domain", { E2E_USER_EMAIL: "person@example.com" }],
  ["external credentials", { RESEND_API_KEY: "real-key" }],
  ["external recipients", { WHATSAPP_INVOICE_SMOKE_TEST_RECIPIENT: "+919999999999" }],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => assertSafeE2EEnvironment({ ...safe, ...overrides }), /REFUSING/);
  });
}
