import assert from "node:assert/strict";
import test from "node:test";
import {
  INVOICE_SMOKE_TEST_CONFIRMATION,
  inspectInvoiceSmokeCandidate,
} from "../invoiceSmokeTest.ts";

const candidate = {
  id: "delivery-1",
  purpose: "INVOICE",
  direction: "OUTBOUND",
  status: "QUEUED",
  dispatchClaimedAt: null,
  metaMessageId: null,
  payload: {
    invoiceDelivery: { reference: "INV-TEST-1", recipient: "919876543210" },
  },
};

const validConfig = {
  allowedDeliveryId: "delivery-1",
  allowedRecipient: "+91 98765 43210",
  requestedDeliveryId: "delivery-1",
  expectedReference: "INV-TEST-1",
  confirmation: INVOICE_SMOKE_TEST_CONFIRMATION,
  transactionalConsentGranted: true,
};

test("allows only the exact configured pristine queued delivery", () => {
  assert.deepEqual(inspectInvoiceSmokeCandidate(candidate, validConfig), {
    eligible: true,
    reasons: [],
    reference: "INV-TEST-1",
    recipientLast4: "3210",
    status: "QUEUED",
  });
});

test("blocks a different delivery id, recipient, reference, or confirmation", () => {
  const result = inspectInvoiceSmokeCandidate(candidate, {
    ...validConfig,
    allowedDeliveryId: "another-delivery",
    allowedRecipient: "919999999999",
    expectedReference: "INV-WRONG",
    confirmation: "send",
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "DELIVERY_NOT_ALLOWLISTED",
    "REFERENCE_MISMATCH",
    "RECIPIENT_MISMATCH",
    "CONFIRMATION_REQUIRED",
  ]);
});

test("blocks records with any claim or provider-side history", () => {
  const result = inspectInvoiceSmokeCandidate({
    ...candidate,
    dispatchClaimedAt: new Date(),
    metaMessageId: "wamid-existing",
    payload: {
      ...candidate.payload,
      outboundContent: {},
      diagnostic: { mediaIdPresent: true, providerError: { code: "META_TIMEOUT" } },
    },
  }, validConfig);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "DELIVERY_ALREADY_CLAIMED",
    "PROVIDER_MESSAGE_ALREADY_PRESENT",
    "OUTBOUND_CONTENT_ALREADY_PRESENT",
    "MEDIA_UPLOAD_ALREADY_PRESENT",
    "PROVIDER_HISTORY_PRESENT",
  ]);
});
