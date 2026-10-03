import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppConnectionStatus } from "../connectionStatus.ts";

test("reconstructs a connected tenant after a later page load", () => {
  const connectedAt = new Date("2026-09-11T10:00:00.000Z");
  const status = buildWhatsAppConnectionStatus({
    status: "CONNECTED",
    credentialRef: "credential-reference",
    connectedAt,
    lastSyncedAt: connectedAt,
    businessAccounts: [{ status: "ACTIVE", phoneNumbers: [{ status: "ACTIVE" }] }],
  });
  assert.equal(status.state, "CONNECTED");
  assert.equal(status.connectedAt, connectedAt.toISOString());
  assert.equal(status.metaAuthorized, true);
  assert.equal(status.wabaConnected, true);
  assert.equal(status.phoneConnected, true);
  assert.equal(status.webhookSubscribed, true);
  assert.equal(status.phoneRegistrationComplete, true);
});

test("returns a stable disconnected response when no integration exists", () => {
  assert.deepEqual(buildWhatsAppConnectionStatus(null), {
    state: "NOT_CONNECTED",
    connectedAt: null,
    lastSyncedAt: null,
    metaAuthorized: false,
    wabaConnected: false,
    phoneConnected: false,
    webhookSubscribed: false,
    phoneRegistrationComplete: false,
    businessAccountCount: 0,
    phoneNumberCount: 0,
    businessAccounts: [],
  });
});

test("does not report authorization or webhook subscription for a locally disconnected integration", () => {
  const status = buildWhatsAppConnectionStatus({
    status: "DISCONNECTED",
    credentialRef: "retained-reference",
    connectedAt: null,
    lastSyncedAt: null,
    businessAccounts: [],
  });
  assert.equal(status.metaAuthorized, false);
  assert.equal(status.webhookSubscribed, false);
});
