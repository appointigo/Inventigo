import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppWebhookService } from "../services/WhatsAppWebhookService.ts";
import {
  parseMetaStatuses,
  parseMetaInboundMessages,
  verifyMetaSignature,
  verifyWebhookChallenge,
} from "../webhooks/metaWebhook.ts";

const envelope = (status: string, timestamp = "1700000000", id = "wamid.1") => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "phone-meta-1" },
            statuses: [
              {
                id,
                status,
                timestamp,
                recipient_id: "919999999999",
                ...(status === "failed"
                  ? { errors: [{ code: 131026, error_data: { details: "Message undeliverable" } }] }
                  : {}),
              },
            ],
          },
        },
      ],
    },
  ],
});

test("verifies challenge tokens and sha256 signatures over the raw body", () => {
  const raw = JSON.stringify(envelope("sent"));
  const secret = "app-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  assert.equal(verifyMetaSignature(raw, signature, secret), true);
  assert.equal(verifyMetaSignature(`${raw} `, signature, secret), false);
  assert.equal(
    verifyWebhookChallenge({ mode: "subscribe", token: "verify", challenge: "123" }, "verify"),
    "123"
  );
  assert.equal(
    verifyWebhookChallenge({ mode: "subscribe", token: "wrong", challenge: "123" }, "verify"),
    null
  );
});

test("parses status callbacks and ignores inbound messages", () => {
  assert.equal(parseMetaStatuses(envelope("delivered")).length, 1);
  assert.deepEqual(
    parseMetaStatuses({
      object: "whatsapp_business_account",
      entry: [
        { id: "waba", changes: [{ field: "messages", value: { messages: [{ id: "inbound" }] } }] },
      ],
    }),
    []
  );
});

test("parses inbound messages with receiving number, contact profile, and reply context", () => {
  const parsed = parseMetaInboundMessages({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-1", display_phone_number: "+1 555" },
              contacts: [{ wa_id: "919999999999", profile: { name: "Asha" } }],
              messages: [
                {
                  id: "wamid.in",
                  from: "919999999999",
                  timestamp: "1700000000",
                  type: "text",
                  context: { id: "wamid.out" },
                  text: { body: "Hello" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.phoneNumberId, "phone-1");
  assert.equal(parsed[0]?.profileName, "Asha");
  assert.equal(parsed[0]?.message.context?.id, "wamid.out");
});

function lifecycleFixture(initialStatus = "SUBMITTED") {
  const webhooks = new Map<
    string,
    { id: string; dedupeKey: string; processingStatus: string; processingAttempts: number }
  >();
  const history: Array<{ eventType: string; occurredAt: Date }> = [];
  const updates: Array<Record<string, unknown>> = [];
  const campaignUpdates: Array<Record<string, unknown>> = [];
  let sequence = 0;
  const db = {
    whatsAppWebhookEvent: {
      upsert: async ({
        where,
        create,
      }: {
        where: { dedupeKey: string };
        create: Record<string, unknown>;
      }) => {
        const existing = webhooks.get(where.dedupeKey);
        if (existing) return existing;
        const row = {
          id: `event-${++sequence}`,
          dedupeKey: where.dedupeKey,
          processingStatus: "RECEIVED",
          processingAttempts: 0,
          ...create,
        };
        webhooks.set(where.dedupeKey, row as never);
        return row;
      },
      updateMany: async ({ where }: { where: { id: string } }) => {
        const row = [...webhooks.values()].find((value) => value.id === where.id);
        if (!row || row.processingStatus === "PROCESSED") return { count: 0 };
        row.processingStatus = "PROCESSING";
        row.processingAttempts++;
        return { count: 1 };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...webhooks.values()].find((value) => value.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    whatsAppMessage: {
      findUnique: async ({ where }: { where: { metaMessageId: string } }) =>
        where.metaMessageId === "unknown"
          ? null
          : {
              id: "message-1",
              organizationId: "org-1",
              campaignRecipientId: "recipient-1",
              status: initialStatus,
              sentAt: null,
              deliveredAt: initialStatus === "READ" ? new Date(1700000100000) : null,
              readAt: initialStatus === "READ" ? new Date(1700000200000) : null,
              failedAt: null,
            },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
    whatsAppCampaignRecipient: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        campaignUpdates.push(data);
        return data;
      },
    },
    whatsAppMessageEvent: {
      create: async ({ data }: { data: { eventType: string; occurredAt: Date } }) => {
        history.push(data);
        return data;
      },
    },
    $transaction: async (operations: unknown[]) => Promise.all(operations),
  } as unknown as PrismaClient;
  return { service: new WhatsAppWebhookService(db), webhooks, history, updates, campaignUpdates };
}

test("persists history and advances SENT, DELIVERED, READ, and FAILED", async () => {
  for (const status of ["sent", "delivered", "read", "failed"] as const) {
    const { service, history, updates, campaignUpdates } = lifecycleFixture();
    await service.receive(envelope(status) as never);
    assert.equal(history[0]?.eventType, `STATUS_${status.toUpperCase()}`);
    assert.equal(updates[0]?.status, status.toUpperCase());
    assert.equal(campaignUpdates[0]?.status, status.toUpperCase());
    if (status === "failed") assert.equal(updates[0]?.errorCode, "131026");
  }
});

test("deduplicates retries and does not regress on out-of-order statuses", async () => {
  const duplicate = lifecycleFixture();
  const payload = envelope("delivered");
  await duplicate.service.receive(payload as never);
  await duplicate.service.receive(payload as never);
  assert.equal(duplicate.history.length, 1);
  const late = lifecycleFixture("READ");
  await late.service.receive(envelope("delivered", "1700000000") as never);
  assert.equal(late.history.length, 1);
  assert.equal(late.updates.length, 0);
});

test("records unknown wamids as processed without creating message history", async () => {
  const fixture = lifecycleFixture();
  await fixture.service.receive(envelope("sent", "1700000000", "unknown") as never);
  assert.equal(fixture.history.length, 0);
  assert.equal([...fixture.webhooks.values()][0]?.processingStatus, "PROCESSED");
});
