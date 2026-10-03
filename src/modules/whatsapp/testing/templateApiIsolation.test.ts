import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppTemplateService } from "../services/WhatsAppTemplateService.ts";

test("template list and detail queries are organization scoped", async () => {
  const where: unknown[] = [];
  const prisma = {
    whatsAppTemplateInstance: {
      findMany: async (query: { where: unknown }) => { where.push(query.where); return []; },
      findFirst: async (query: { where: unknown }) => { where.push(query.where); return null; },
    },
  } as unknown as PrismaClient;
  const service = new WhatsAppTemplateService(prisma);
  await service.list("org-a");
  await assert.rejects(service.get("org-a", "template-1"));
  assert.equal(where.length, 2);
  assert.equal(where.every(value => JSON.stringify(value).includes("org-a")), true);
});
