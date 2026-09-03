import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { CommunicationRequest } from "../../communication/types.ts";
import { WhatsAppError } from "../errors.ts";
import type { CampaignJobQueue, ClaimedCampaignJob } from "../queue/CampaignJobQueue.ts";
import { PrismaCampaignJobQueue } from "../queue/PrismaCampaignJobQueue.ts";
import { WhatsAppCampaignExecutionService } from "../services/WhatsAppCampaignExecutionService.ts";
import { WhatsAppCampaignMetricsService } from "../services/WhatsAppCampaignMetricsService.ts";

const job: ClaimedCampaignJob = {
  recipientId: "recipient-1",
  campaignId: "campaign-1",
  organizationId: "org-1",
  lockToken: "lease-1",
  attempt: 1,
  maxAttempts: 5,
};

class TestQueue implements CampaignJobQueue {
  completed: string[] = [];
  skipped: string[] = [];
  released: Date[] = [];
  retried: Date[] = [];
  failed: string[] = [];
  constructor(private readonly jobs: ClaimedCampaignJob[] = [job]) {}
  async claimBatch() {
    return this.jobs;
  }
  async complete(id: string) {
    this.completed.push(id);
  }
  async release(_id: string, _token: string, availableAt: Date) {
    this.released.push(availableAt);
  }
  async skip(_id: string, _token: string, reason: string) {
    this.skipped.push(reason);
  }
  async retry(_id: string, _token: string, _error: string, availableAt: Date) {
    this.retried.push(availableAt);
  }
  async fail(_id: string, _token: string, error: string) {
    this.failed.push(error);
  }
}

function executionDb(campaignStatus = "QUEUED") {
  const recipient = {
    id: job.recipientId,
    campaignId: job.campaignId,
    snapshot: { normalizedPhone: "+12025550111", customerName: "Ada" },
    campaign: {
      status: campaignStatus,
      templateDefinitionId: "definition-1",
      templateDefinition: { key: "offer_v1", language: "en_US", version: 1 },
      stores: [
        { storeId: "store-1", senderId: "sender-1", sender: { phoneNumber: { wabaId: "waba-1" } } },
      ],
    },
    contact: {
      stores: [{ storeId: "store-1" }],
      consents: [{ status: "GRANTED" }],
    },
  };
  return {
    whatsAppCampaignRecipient: {
      findFirst: async () => recipient,
      update: async () => recipient,
      count: async () => 0,
    },
    whatsAppTemplateInstance: { findFirst: async () => ({ id: "template-instance-1" }) },
    whatsAppCampaign: { updateMany: async () => ({ count: 1 }) },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  } as unknown as PrismaClient;
}

test("a claimed recipient dispatches once through CommunicationService with its frozen sender", async () => {
  const queue = new TestQueue();
  const requests: CommunicationRequest[] = [];
  const communication = {
    send: async (request: CommunicationRequest) => {
      requests.push(request);
      return { channel: "WHATSAPP" as const, messageId: "message-1", status: "SUBMITTED" as const };
    },
  };
  const service = new WhatsAppCampaignExecutionService(executionDb(), queue, communication);
  assert.deepEqual(await service.processBatch(), { claimed: 1 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].message.senderMappingId, "sender-1");
  assert.equal(requests[0].message.campaignRecipientId, job.recipientId);
  assert.deepEqual(queue.completed, [job.recipientId]);
});

test("retryable provider errors are backed off instead of becoming terminal immediately", async () => {
  const queue = new TestQueue();
  const service = new WhatsAppCampaignExecutionService(executionDb(), queue, {
    send: async () => {
      throw new WhatsAppError("META_RATE_LIMITED", "Slow down", { retryable: true });
    },
  });
  const before = Date.now();
  await service.processBatch();
  assert.equal(queue.retried.length, 1);
  assert.ok(queue.retried[0].getTime() >= before + 29_000);
  assert.deepEqual(queue.failed, []);
});

test("paused campaigns release their lease without dispatching or consuming an attempt", async () => {
  const queue = new TestQueue();
  let sends = 0;
  const service = new WhatsAppCampaignExecutionService(executionDb("PAUSED"), queue, {
    send: async () => {
      sends += 1;
      throw new Error("must not send");
    },
  });
  await service.processBatch();
  assert.equal(sends, 0);
  assert.equal(queue.released.length, 1);
});

test("metrics use the latest persisted WhatsApp message lifecycle", async () => {
  const db = {
    whatsAppCampaign: {
      findFirst: async () => ({
        id: "campaign-1",
        status: "RUNNING",
      }),
    },
    whatsAppCampaignRecipient: {
      groupBy: async () => [
        { status: "QUEUED", _count: 1 },
        { status: "SENT", _count: 1 },
        { status: "DELIVERED", _count: 1 },
        { status: "READ", _count: 1 },
        { status: "FAILED", _count: 1 },
        { status: "SKIPPED", _count: 1 },
      ],
    },
  } as unknown as PrismaClient;
  assert.deepEqual(await new WhatsAppCampaignMetricsService(db).get("org-1", "campaign-1"), {
    campaignId: "campaign-1",
    status: "RUNNING",
    queued: 1,
    sent: 1,
    delivered: 1,
    read: 1,
    failed: 1,
    skipped: 1,
  });
});

test("database queue writes a deterministic idempotent job ID", async () => {
  let updateData: Record<string, unknown> | undefined;
  const db = {
    whatsAppCampaignRecipient: {
      findFirst: async () => ({
        id: "recipient-1",
        campaignId: "campaign-1",
        attempts: 0,
        maxAttempts: 5,
        campaign: { organizationId: "org-1" },
      }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return { count: 1 };
      },
    },
  } as unknown as PrismaClient;
  await new PrismaCampaignJobQueue(db).claimBatch(1, new Date("2026-09-03T12:00:00Z"));
  assert.equal(updateData?.jobId, "whatsapp-campaign:campaign-1:recipient-1");
});
