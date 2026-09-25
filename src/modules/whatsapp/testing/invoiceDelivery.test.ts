import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppInvoiceDeliveryService } from "../services/WhatsAppInvoiceDeliveryService.ts";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";
import { WhatsAppError } from "../errors.ts";

const queuedMessage = () => ({
  id: "delivery-1",
  organizationId: "org-1",
  storeId: "store-1",
  phoneNumberId: "phone-1",
  referenceType: "SALE",
  referenceId: "sale-1",
  createdAt: new Date("2026-09-25T08:00:00.000Z"),
  status: "QUEUED",
  metaMessageId: null,
  dispatchClaimedAt: null,
  payload: {
    invoiceDelivery: {
      correlationId: "request-1",
      deploymentEnvironment: "test",
      kind: "SALE",
      transactionId: "sale-1",
      recipient: "919876543210",
      customerName: "Test Customer",
      reference: "INV-1",
      storeName: "Test Store",
      amount: 1050,
      variableCount: 4,
      variableKeys: ["1", "2", "3", "4"],
      transactionDate: "2026-09-25T08:00:00.000Z",
      resend: false,
    },
  },
  phoneNumber: {
    metaPhoneNumberId: "meta-phone-1",
    wabaId: "waba-1",
    waba: {
      integration: {
        organizationId: "org-1",
        status: "CONNECTED",
        credentialRef: "credential-ref-1",
      },
    },
  },
  templateInstance: {
    id: "template-instance-1",
    wabaId: "waba-1",
    status: "APPROVED",
    metaTemplateName: "invoice_delivery",
    definition: { key: "invoice_delivery", language: "en_US", version: 1 },
  },
});

function fakePrisma(initial = queuedMessage()) {
  const state = structuredClone(initial);
  return {
    state,
    client: {
      whatsAppMessage: {
        findFirst: async () => state,
        count: async () => 1,
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          if (state.status !== "QUEUED" || state.dispatchClaimedAt) return { count: 0 };
          Object.assign(state, data);
          return { count: 1 };
        },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(state, data);
          return state;
        },
      },
    } as unknown as PrismaClient,
  };
}

test("claims, renders, uploads, and submits an invoice exactly once", async () => {
  const prisma = fakePrisma();
  const meta = new MockMetaWhatsAppClient();
  let renders = 0;
  const service = new WhatsAppInvoiceDeliveryService(prisma.client, meta, async () => {
    renders += 1;
    return { buffer: Buffer.from("%PDF-test"), filename: "invoice-INV-1.pdf", reference: "INV-1" };
  });

  const result = await service.processMessage("delivery-1");
  assert.equal(result.status, "SUBMITTED");
  assert.equal(result.metaMessageId, "mock-message-id");
  assert.equal(renders, 1);
  assert.equal(meta.requests.length, 1);

  await service.processMessage("delivery-1");
  assert.equal(renders, 1);
  assert.equal(meta.requests.length, 1);
});

test("claimed configuration failures become FAILED instead of remaining QUEUED", async () => {
  const message = queuedMessage();
  message.phoneNumber.waba.integration.status = "DISCONNECTED";
  const prisma = fakePrisma(message);
  const meta = new MockMetaWhatsAppClient();
  const service = new WhatsAppInvoiceDeliveryService(prisma.client, meta, async () => {
    throw new Error("PDF_SHOULD_NOT_RUN");
  });

  await assert.rejects(service.processMessage("delivery-1"), /WHATSAPP_NOT_CONNECTED/);
  assert.equal(prisma.state.status, "FAILED");
  assert.equal((prisma.state as typeof prisma.state & { errorCode?: string }).errorCode, "WHATSAPP_NOT_CONNECTED");
  assert.equal(prisma.state.dispatchClaimedAt, null);
  assert.equal(meta.requests.length, 0);
});

test("keeps ambiguous provider timeouts outcome-unknown to prevent an automatic duplicate", async () => {
  const prisma = fakePrisma();
  const meta = new MockMetaWhatsAppClient();
  meta.error = new WhatsAppError("META_TIMEOUT", "Provider timed out", { retryable: true });
  const service = new WhatsAppInvoiceDeliveryService(prisma.client, meta, async () => ({
    buffer: Buffer.from("%PDF-test"),
    filename: "invoice-INV-1.pdf",
    reference: "INV-1",
  }));

  await assert.rejects(service.processMessage("delivery-1"), /Provider timed out/);
  assert.equal(prisma.state.status, "FAILED");
  assert.equal(
    (prisma.state as typeof prisma.state & { errorCode?: string }).errorCode,
    "INVOICE_PROVIDER_OUTCOME_UNKNOWN"
  );
  assert.equal(meta.requests.length, 1);
});
