import assert from "node:assert/strict";
import test from "node:test";
import { sendVerificationEmail, verificationCodeBrowserEnabled, verificationEmailConfigured, VerificationEmailError } from "./verificationEmail.ts";

const code = "123456";
const email = "new-user@example.com";

test("requires a configured sender and never falls back to a console OTP", async () => {
  await assert.rejects(
    sendVerificationEmail(email, code, "signup", { apiKey: "test-key", from: "onboarding@resend.dev" }),
    (error) => error instanceof VerificationEmailError && error.reason === "NOT_CONFIGURED",
  );
  await assert.rejects(
    sendVerificationEmail(email, code, "signup", { apiKey: "test-key", from: "" }),
    (error) => error instanceof VerificationEmailError && error.reason === "NOT_CONFIGURED",
  );
});

test("reports provider rejection instead of claiming the code was sent", async () => {
  await assert.rejects(
    sendVerificationEmail(email, code, "signup", {
      apiKey: "test-key",
      from: "Stockiva <verify@stockiva.example>",
      fetcher: async () => new Response("forbidden", { status: 403 }),
    }),
    (error) => error instanceof VerificationEmailError && error.reason === "PROVIDER_REJECTED" && error.providerStatus === 403,
  );
});

test("uses the configured sender and recipient when Resend accepts the send", async () => {
  let payload: Record<string, unknown> | undefined;
  await sendVerificationEmail(email, code, "resend", {
    apiKey: "test-key",
    from: "Stockiva <verify@stockiva.example>",
    fetcher: async (_url, init) => {
      payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
    },
  });
  assert.equal(payload?.from, "Stockiva <verify@stockiva.example>");
  assert.equal(payload?.to, email);
  assert.match(String(payload?.text), /123456/);
});

test("prints codes only when console mode is explicitly enabled in development", async (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousConsoleMode = process.env.AUTH_VERIFICATION_CONSOLE_MODE;
  t.after(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousConsoleMode === undefined) delete process.env.AUTH_VERIFICATION_CONSOLE_MODE;
    else process.env.AUTH_VERIFICATION_CONSOLE_MODE = previousConsoleMode;
  });

  const logged: string[] = [];
  t.mock.method(console, "info", (message: string) => logged.push(message));
  const noFetch: typeof fetch = async () => { throw new Error("Resend must not be called in console mode"); };

  process.env.NODE_ENV = "development";
  process.env.AUTH_VERIFICATION_CONSOLE_MODE = "true";
  assert.equal(verificationEmailConfigured({ apiKey: "", from: "" }), true);
  assert.equal(await sendVerificationEmail(email, code, "signup", { apiKey: "", from: "", fetcher: noFetch }), "console");
  assert.deepEqual(logged, [`[auth:verification-code] signup ${email}: ${code}`]);

  process.env.NODE_ENV = "production";
  assert.equal(verificationEmailConfigured({ apiKey: "", from: "" }), false);
  await assert.rejects(
    sendVerificationEmail(email, code, "signup", { apiKey: "", from: "", fetcher: noFetch }),
    (error) => error instanceof VerificationEmailError && error.reason === "NOT_CONFIGURED",
  );
  assert.equal(logged.length, 1);
});

test("browser code exposure requires localhost, same origin, and development console mode", (t) => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousConsoleMode = process.env.AUTH_VERIFICATION_CONSOLE_MODE;
  t.after(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousConsoleMode === undefined) delete process.env.AUTH_VERIFICATION_CONSOLE_MODE;
    else process.env.AUTH_VERIFICATION_CONSOLE_MODE = previousConsoleMode;
  });

  process.env.NODE_ENV = "development";
  process.env.AUTH_VERIFICATION_CONSOLE_MODE = "true";
  assert.equal(verificationCodeBrowserEnabled("http://localhost:3000/api/auth/register", "http://localhost:3000"), true);
  assert.equal(verificationCodeBrowserEnabled("http://localhost:3000/api/auth/register", "https://other.example"), false);
  assert.equal(verificationCodeBrowserEnabled("https://stockiva.com/api/auth/register", "https://stockiva.com"), false);
  assert.equal(verificationCodeBrowserEnabled("http://localhost:3000/api/auth/register", null), false);
  process.env.NODE_ENV = "production";
  assert.equal(verificationCodeBrowserEnabled("http://localhost:3000/api/auth/register", "http://localhost:3000"), false);
});
