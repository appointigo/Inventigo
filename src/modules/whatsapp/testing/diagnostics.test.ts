import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWhatsAppFailureDiagnostic,
  isWhatsAppDebugDiagnosticsEnabled,
} from "../diagnostics.ts";
import { WhatsAppError } from "../errors.ts";

test("WhatsApp browser diagnostics are disabled by default", () => {
  assert.equal(isWhatsAppDebugDiagnosticsEnabled({}), false);
  assert.equal(
    isWhatsAppDebugDiagnosticsEnabled({ WHATSAPP_DEBUG_DIAGNOSTICS: "false" }),
    false
  );
  assert.equal(
    isWhatsAppDebugDiagnosticsEnabled({ WHATSAPP_DEBUG_DIAGNOSTICS: "true" }),
    true
  );
});

test("failure diagnostics expose only the explicit sanitized allowlist", () => {
  const error = new WhatsAppError("META_PROVIDER_FAILED", "safe error", {
    details: {
      httpStatus: 403,
      providerCode: 190,
      providerSubcode: 33,
      providerType: "OAuthException",
      providerMessage: "Sanitized provider message",
      contentType: "application/json; charset=UTF-8",
      traceId: "trace-1",
      accessToken: "must-not-leak",
      authorization: "Bearer must-not-leak",
      appSecret: "must-not-leak",
    },
  });

  const diagnostic = buildWhatsAppFailureDiagnostic(error, "meta_fetch_started", 312);
  assert.deepEqual(diagnostic, {
    stage: "meta_fetch_started",
    upstreamHttpStatus: 403,
    metaErrorCode: 190,
    metaErrorSubcode: 33,
    metaErrorType: "OAuthException",
    metaContentType: "application/json; charset=UTF-8",
    sanitizedMetaMessage: "Sanitized provider message",
    fbtraceId: "trace-1",
    durationMs: 312,
  });
  assert.equal(JSON.stringify(diagnostic).includes("must-not-leak"), false);
});
