import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppCampaignService } from "../services/WhatsAppCampaignService.ts";

const organizationId = "org-a";
const storeId = "00000000-0000-4000-8000-000000000001";
const senderId = "00000000-0000-4000-8000-000000000002";

test("audience preview is tenant/store scoped and requires explicit marketing consent", async () => {
  let audienceWhere: unknown;
  const db = {
    storeWhatsAppSender: {
      findMany: async () => [{ id: senderId, storeId, phoneNumber: { wabaId: "waba-a" } }],
    },
    whatsAppContact: {
      findMany: async ({ where }: { where: unknown }) => {
        audienceWhere = where;
        return [
          {
            id: "contact-1",
            normalizedPhone: "+12025550101",
            customer: { name: "Ada" },
            consents: [{ purpose: "MARKETING", status: "GRANTED" }],
          },
          {
            id: "contact-2",
            normalizedPhone: "+12025550102",
            customer: { name: "Grace" },
            consents: [{ purpose: "MARKETING", status: "PENDING" }],
          },
          { id: "contact-3", normalizedPhone: "+12025550103", customer: null, consents: [] },
        ];
      },
    },
  } as unknown as PrismaClient;

  const result = await new WhatsAppCampaignService(db).preview(organizationId, {
    stores: [{ storeId, senderId }],
    audience: { tags: ["vip"], minTotalSpent: 100 },
  });

  assert.deepEqual(result, {
    totalMatched: 3,
    eligibleCount: 1,
    excludedCount: 2,
    noConsentCount: 2,
    sample: [{ id: "contact-1", phone: "+12025550101", name: "Ada" }],
  });
  assert.deepEqual(audienceWhere, {
    organizationId,
    stores: { some: { storeId: { in: [storeId] } } },
    customer: { is: { tags: { hasSome: ["vip"] }, totalSpent: { gte: 100 } } },
  });
});

test("a sender outside the requested tenant/store is rejected", async () => {
  const db = {
    storeWhatsAppSender: { findMany: async () => [] },
  } as unknown as PrismaClient;

  await assert.rejects(
    new WhatsAppCampaignService(db).preview(organizationId, {
      stores: [{ storeId, senderId }],
      audience: { tags: [] },
    }),
    /Invalid marketing sender selection/
  );
});

test("campaign creation requires a template instance for every selected sender WABA", async () => {
  const secondStoreId = "00000000-0000-4000-8000-000000000003";
  const secondSenderId = "00000000-0000-4000-8000-000000000004";
  const db = {
    storeWhatsAppSender: {
      findMany: async () => [
        { id: senderId, storeId, phoneNumber: { wabaId: "waba-a" } },
        { id: secondSenderId, storeId: secondStoreId, phoneNumber: { wabaId: "waba-b" } },
      ],
    },
    whatsAppTemplateDefinition: {
      findFirst: async () => ({ id: "definition", instances: [{ wabaId: "waba-a" }] }),
    },
  } as unknown as PrismaClient;

  await assert.rejects(
    new WhatsAppCampaignService(db).create(organizationId, {
      name: "Launch offer",
      templateDefinitionId: "definition",
      stores: [
        { storeId, senderId },
        { storeId: secondStoreId, senderId: secondSenderId },
      ],
      audience: { tags: [] },
      scheduledAt: null,
    }),
    /unavailable for one or more sender WABAs/
  );
});

test("a pending marketing template can only create an unscheduled draft", async () => {
  const created: Array<Record<string, unknown>> = [];
  const tx = {
    whatsAppCampaign: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "campaign-1", ...data };
      },
    },
    whatsAppCampaignRecipient: { createMany: async () => ({ count: 0 }) },
  };
  const db = {
    storeWhatsAppSender: {
      findMany: async () => [{ id: senderId, storeId, phoneNumber: { wabaId: "waba-a" } }],
    },
    whatsAppTemplateDefinition: {
      findFirst: async () => ({
        id: "definition",
        instances: [{ wabaId: "waba-a", status: "PENDING" }],
      }),
    },
    whatsAppContact: { findMany: async () => [] },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  const result = await new WhatsAppCampaignService(db).create(organizationId, {
    name: "Pending offer",
    templateDefinitionId: "definition",
    stores: [{ storeId, senderId }],
    audience: { tags: [] },
    scheduledAt: null,
  });
  assert.equal(created[0]?.status, "DRAFT");
  assert.equal(created[0]?.scheduledAt, null);
  assert.equal(result.waitingForTemplateApproval, true);
});
