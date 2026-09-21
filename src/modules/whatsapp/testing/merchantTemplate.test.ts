import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppError } from "../errors.ts";
import { WhatsAppMerchantTemplateService } from "../services/WhatsAppMerchantTemplateService.ts";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";

const input = {
  wabaId: "f0af18a3-b634-4687-8d7b-cb332e77ee58",
  blueprintId: "festival_offer_v1",
  displayLabel: "Festival Offer",
  metaTemplateName: "rare_thread_festival_offer_v1_en_us",
  language: "en_US" as const,
  category: "MARKETING" as const,
  purpose: "MARKETING_PROMOTION" as const,
  body: "Hi {{1}}, save {{2}}.",
  footer: "Reply STOP to opt out.",
  variables: [
    { position: 1, key: "customerName", example: "Aarav" },
    { position: 2, key: "discount", example: "20%" },
  ],
};

function fixture() {
  const definitions: Array<Record<string, unknown>> = [];
  const instances: Array<Record<string, unknown>> = [];
  const tx = {
    whatsAppTemplateDefinition: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        definitions.push(data);
        return { id: "definition-1" };
      },
    },
    whatsAppTemplateInstance: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        instances.push(data);
        return {
          id: "instance-1",
          metaTemplateId: data.metaTemplateId,
          metaTemplateName: data.metaTemplateName,
          status: data.status,
          submittedAt: data.submittedAt,
        };
      },
    },
  };
  const db = {
    whatsAppBusinessAccount: {
      findFirst: async () => ({
        id: input.wabaId,
        metaWabaId: "meta-waba-1",
        integration: { credentialRef: "credential-1" },
      }),
    },
    whatsAppTemplateInstance: { findFirst: async () => null },
    $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  const meta = new MockMetaWhatsAppClient();
  return {
    definitions,
    instances,
    meta,
    service: new WhatsAppMerchantTemplateService(db, meta),
  };
}

test("submits a merchant marketing template once and persists Meta pending status", async () => {
  const { definitions, instances, meta, service } = fixture();
  const result = await service.create("org-1", input);
  assert.equal(meta.templateCreateRequests.length, 1);
  assert.equal(meta.templateCreateRequests[0]?.metaWabaId, "meta-waba-1");
  assert.equal(meta.templateCreateRequests[0]?.category, "MARKETING");
  assert.equal(definitions[0]?.source, "MERCHANT");
  assert.equal(definitions[0]?.organizationId, "org-1");
  assert.equal(instances[0]?.status, "PENDING");
  assert.equal(result.status, "PENDING");
});

test("does not POST when the WABA already contains the same name and language", async () => {
  const { meta, service } = fixture();
  meta.templates = [{
    id: "existing-1",
    name: input.metaTemplateName,
    language: input.language,
    category: "MARKETING",
    status: "PENDING",
  }];
  await assert.rejects(
    service.create("org-1", input),
    (error: unknown) =>
      error instanceof WhatsAppError && error.code === "TEMPLATE_ALREADY_EXISTS"
  );
  assert.equal(meta.templateCreateRequests.length, 0);
});
