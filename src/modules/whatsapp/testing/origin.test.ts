import assert from "node:assert/strict";
import test from "node:test";
import {
  isWhatsAppOriginAllowed,
  parseWhatsAppAllowedOrigins,
  resolveWhatsAppPublicOrigin,
} from "../security/origin.ts";

const cloudflareOrigin = "https://angeles-features-zones-skills.trycloudflare.com";
const railwayOrigin = "https://stockiva-staging.up.railway.app";
const allowedOrigins = [cloudflareOrigin, railwayOrigin];

test("parses and normalizes an exact HTTPS origin allowlist", () => {
  assert.deepEqual(
    parseWhatsAppAllowedOrigins(`${cloudflareOrigin}/, ${railwayOrigin}, ${cloudflareOrigin}`),
    allowedOrigins
  );
});

test("rejects insecure, wildcard, and path-based allowlist entries", () => {
  for (const value of [
    "http://localhost:3000",
    "https://*.trycloudflare.com",
    "https://example.com/dashboard/whatsapp",
    "https://example.com,",
  ]) assert.throws(() => parseWhatsAppAllowedOrigins(value), /WHATSAPP_ALLOWED_ORIGINS/);
});

test("allows only exact configured origins", () => {
  assert.equal(isWhatsAppOriginAllowed(cloudflareOrigin, allowedOrigins), true);
  assert.equal(isWhatsAppOriginAllowed("https://other.trycloudflare.com", allowedOrigins), false);
  assert.equal(isWhatsAppOriginAllowed("http://localhost:3000", allowedOrigins), false);
});

test("uses an allowed browser Origin as the canonical public origin", () => {
  const request = new Request(`${cloudflareOrigin}/api/whatsapp/embedded-signup/session`, {
    method: "POST",
    headers: { origin: cloudflareOrigin },
  });
  assert.equal(resolveWhatsAppPublicOrigin(request, allowedOrigins), cloudflareOrigin);
});

test("rejects a disallowed browser Origin instead of trusting proxy fallbacks", () => {
  const request = new Request("http://internal:3000/api/whatsapp/embedded-signup/session", {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "stockiva-staging.up.railway.app",
    },
  });
  assert.equal(resolveWhatsAppPublicOrigin(request, allowedOrigins), null);
});

test("supports validated reverse-proxy headers when Origin is absent", () => {
  const request = new Request("http://internal:3000/api/whatsapp/embedded-signup/session", {
    method: "POST",
    headers: {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "stockiva-staging.up.railway.app",
    },
  });
  assert.equal(resolveWhatsAppPublicOrigin(request, allowedOrigins), railwayOrigin);
});

test("rejects spoofed or insecure proxy origins", () => {
  const spoofed = new Request("http://internal:3000/api/whatsapp/embedded-signup/session", {
    method: "POST",
    headers: {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "evil.example",
    },
  });
  const insecure = new Request("http://localhost:3000/api/whatsapp/embedded-signup/session", {
    method: "POST",
  });
  assert.equal(resolveWhatsAppPublicOrigin(spoofed, allowedOrigins), null);
  assert.equal(resolveWhatsAppPublicOrigin(insecure, allowedOrigins), null);
});
