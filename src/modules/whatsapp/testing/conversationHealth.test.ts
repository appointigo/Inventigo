import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppConversationService } from "../services/WhatsAppConversationService.ts";
import { WhatsAppIntegrationHealthService } from "../services/WhatsAppIntegrationHealthService.ts";

test("conversation reads always scope list and detail to the authenticated organization", async () => {
  const seen: unknown[] = [];
  const db = {
    whatsAppConversation: {
      count: async ({ where }: { where: unknown }) => {
        seen.push(where);
        return 0;
      },
      findMany: async ({ where }: { where: unknown }) => {
        seen.push(where);
        return [];
      },
      findFirst: async ({ where }: { where: unknown }) => {
        seen.push(where);
        return { id: "conversation-1" };
      },
    },
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  } as unknown as PrismaClient;
  const service = new WhatsAppConversationService(db);
  await service.list("org-a", { page: 1, pageSize: 20 });
  await service.get("org-a", "conversation-1");
  assert.deepEqual(
    seen.map((value) => (value as { organizationId: string }).organizationId),
    ["org-a", "org-a", "org-a"]
  );
});

test("health aggregates tenant-scoped signals and never returns raw webhook payloads", async () => {
  const wheres: unknown[] = [];
  const db = {
    whatsAppIntegration: {
      findFirst: async ({ where }: { where: unknown }) => {
        wheres.push(where);
        return null;
      },
    },
    whatsAppWebhookEvent: {
      findFirst: async ({ where }: { where: unknown }) => {
        wheres.push(where);
        return null;
      },
    },
    whatsAppMessage: {
      findFirst: async ({ where }: { where: unknown }) => {
        wheres.push(where);
        return null;
      },
    },
    whatsAppTemplateInstance: {
      groupBy: async ({ where }: { where: unknown }) => {
        wheres.push(where);
        return [];
      },
    },
  } as unknown as PrismaClient;
  const result = await new WhatsAppIntegrationHealthService(db).get("org-a");
  assert.equal(JSON.stringify(result).includes("payload"), false);
  assert.equal(result.overallStatus, "ACTION_REQUIRED");
  assert.equal((wheres[0] as { organizationId: string }).organizationId, "org-a");
  assert.equal((wheres[1] as { organizationId: string }).organizationId, "org-a");
});
