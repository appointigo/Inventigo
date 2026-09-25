import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

const runTrigger = (env) => new Promise((resolve) => {
  const child = spawn(process.execPath, ["scripts/trigger-whatsapp-invoice-worker.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.on("close", code => resolve({ code, stdout, stderr }));
});

test("Railway trigger awaits the authenticated invoice worker response", async () => {
  let requestSeen = false;
  const server = createServer((request, response) => {
    requestSeen = true;
    assert.equal(request.url, "/api/cron/whatsapp-invoices");
    assert.equal(request.headers.authorization, "Bearer test-cron-secret");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ invoices: { attempted: 0, submitted: 0, failed: 0 } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const result = await runTrigger({
    CRON_SECRET: "test-cron-secret",
    STOCKIVA_APP_URL: `http://127.0.0.1:${address.port}`,
    RAILWAY_PUBLIC_DOMAIN: "",
  });
  server.close();
  assert.equal(result.code, 0, result.stderr);
  assert.equal(requestSeen, true);
  assert.match(result.stdout, /request_completed/);
});

test("Railway trigger fails clearly when runtime configuration is absent", async () => {
  const result = await runTrigger({ CRON_SECRET: "", STOCKIVA_APP_URL: "", RAILWAY_PUBLIC_DOMAIN: "" });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /CRON_SECRET_REQUIRED/);
});
