import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";
import { WhatsAppTemplateReconciliationService } from "../services/WhatsAppTemplateReconciliationService.ts";
import { invoiceV1Definition } from "../templates/invoiceV1.ts";

function fixture(wabas = [{ id: "waba-db-1", metaWabaId: "meta-waba-1", integration: { credentialRef: "credential-1" } }]) {
  const instances: Array<Record<string, unknown>> = [];
  const db = {
    whatsAppTemplateDefinition: { upsert: async () => invoiceV1Definition },
    whatsAppBusinessAccount: { findMany: async () => wabas },
    whatsAppTemplateInstance: { upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => { instances.push({ ...create, ...update }); } },
  } as unknown as PrismaClient;
  const meta = new MockMetaWhatsAppClient();
  return { instances, meta, service: new WhatsAppTemplateReconciliationService(db, meta) };
}

test("keeps an existing approved template and does not duplicate it", async () => {
  const { meta, service, instances } = fixture();
  meta.templates = [{ id: "template-1", name: invoiceV1Definition.name, language: "en_US", category: "UTILITY", status: "APPROVED" }];
  const result = await service.reconcileInvoiceV1({ organizationId: "org-1" });
  assert.equal(result[0]?.created, false);
  assert.equal(meta.templateCreateRequests.length, 0);
  assert.equal(instances[0]?.status, "APPROVED");
});

test("creates a missing template once as pending", async () => {
  const { meta, service, instances } = fixture();
  await service.reconcileInvoiceV1({ organizationId: "org-1" });
  assert.equal(meta.templateCreateRequests.length, 1);
  assert.equal(meta.templateCreateRequests[0]?.name, "stockiva_invoice_v1_en_us");
  assert.equal(instances[0]?.status, "PENDING");
});

for (const [status, reason] of [["PENDING"], ["REJECTED", "Incorrect category"], ["PAUSED"], ["DISABLED"]] as const) {
  test(`persists ${status} template state and rejection metadata`, async () => {
    const { meta, service, instances } = fixture();
    meta.templates = [{ id: "template-1", name: invoiceV1Definition.name, language: "en_US", category: "UTILITY", status, rejectionReason: reason }];
    await service.reconcileInvoiceV1({ organizationId: "org-1" });
    assert.equal(instances[0]?.status, status);
    assert.equal(instances[0]?.rejectionReason, reason ?? null);
  });
}

test("reconciles each WABA independently", async () => {
  const { meta, service, instances } = fixture([
    { id: "waba-db-1", metaWabaId: "meta-waba-1", integration: { credentialRef: "credential-1" } },
    { id: "waba-db-2", metaWabaId: "meta-waba-2", integration: { credentialRef: "credential-2" } },
  ]);
  await service.reconcileInvoiceV1({ organizationId: "org-1" });
  assert.equal(meta.templateCreateRequests.length, 2);
  assert.deepEqual(instances.map(instance => instance.wabaId), ["waba-db-1", "waba-db-2"]);
});

test("versioned definitions use independent deterministic Meta names", () => {
  const v2 = { ...invoiceV1Definition, id: "stockiva-platform-invoice-v2-en-us", key: "invoice_v2", version: 2, name: "stockiva_invoice_v2_en_us" };
  assert.notEqual(invoiceV1Definition.name, v2.name);
  assert.equal(invoiceV1Definition.version, 1);
  assert.equal(v2.version, 2);
});
