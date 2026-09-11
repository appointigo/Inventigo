import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";
import { WhatsAppTemplateReconciliationService } from "../services/WhatsAppTemplateReconciliationService.ts";
import { invoiceV1Definition } from "../templates/invoiceV1.ts";
import { WhatsAppError } from "../errors.ts";

function fixture(wabas = [{ id: "waba-db-1", metaWabaId: "meta-waba-1", integration: { credentialRef: "credential-1" } }]) {
  const instances: Array<Record<string, unknown>> = [];
  const queries: Array<Record<string, unknown>> = [];
  const db = {
    whatsAppTemplateDefinition: { upsert: async () => invoiceV1Definition },
    whatsAppBusinessAccount: { findMany: async (query: Record<string, unknown>) => {
      queries.push(query);
      const ids = ((query.where as { id?: { in?: string[] } })?.id?.in);
      return ids ? wabas.filter(waba => ids.includes(waba.id)) : wabas;
    } },
    whatsAppTemplateInstance: { upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => { instances.push({ ...create, ...update }); } },
  } as unknown as PrismaClient;
  const meta = new MockMetaWhatsAppClient();
  return { instances, meta, queries, service: new WhatsAppTemplateReconciliationService(db, meta) };
}

test("keeps an existing approved template and does not duplicate it", async () => {
  const { meta, service, instances } = fixture();
  meta.templates = [{ id: "template-1", name: invoiceV1Definition.name, language: "en_US", category: "UTILITY", status: "APPROVED" }];
  const result = await service.reconcileInvoiceV1({ organizationId: "org-1" });
  assert.equal(result[0]?.created, false);
  assert.equal(result[0]?.comparison, "APPROVED");
  assert.equal(meta.templateCreateRequests.length, 0);
  assert.equal(instances[0]?.status, "APPROVED");
});

test("creates a missing template once as pending", async () => {
  const { meta, service, instances } = fixture();
  const result = await service.reconcileInvoiceV1({ organizationId: "org-1" });
  assert.equal(meta.templateCreateRequests.length, 1);
  assert.equal(meta.templateCreateRequests[0]?.name, "stockiva_invoice_v1_en_us");
  assert.equal(instances[0]?.status, "PENDING");
  assert.equal(result[0]?.comparison, "MISSING");
});

for (const [status, reason] of [["PENDING"], ["REJECTED", "Incorrect category"], ["PAUSED"], ["DISABLED"]] as const) {
  test(`persists ${status} template state and rejection metadata`, async () => {
    const { meta, service, instances } = fixture();
    meta.templates = [{ id: "template-1", name: invoiceV1Definition.name, language: "en_US", category: "UTILITY", status, rejectionReason: reason }];
    const result = await service.reconcileInvoiceV1({ organizationId: "org-1" });
    assert.equal(instances[0]?.status, status);
    assert.equal(instances[0]?.rejectionReason, reason ?? null);
    assert.equal(result[0]?.comparison, status === "PAUSED" || status === "DISABLED" ? "EXISTS" : status);
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

test("uses only the selected active tenant WABA", async () => {
  const { meta, service, queries } = fixture([
    { id: "waba-db-1", metaWabaId: "meta-waba-1", integration: { credentialRef: "credential-1" } },
    { id: "waba-db-2", metaWabaId: "meta-waba-2", integration: { credentialRef: "credential-2" } },
  ]);
  const result = await service.reconcileInvoiceV1({ organizationId: "org-1", wabaIds: ["waba-db-2"] });
  assert.deepEqual(result.map(item => item.wabaId), ["waba-db-2"]);
  assert.equal(meta.templateCreateRequests[0]?.metaWabaId, "meta-waba-2");
  assert.deepEqual(queries[0]?.where, {
    id: { in: ["waba-db-2"] },
    status: "ACTIVE",
    integration: { organizationId: "org-1", status: "CONNECTED", credentialRef: { not: null } },
  });
});

test("versioned definitions use independent deterministic Meta names", () => {
  const v2 = { ...invoiceV1Definition, id: "stockiva-platform-invoice-v2-en-us", key: "invoice_v2", version: 2, name: "stockiva_invoice_v2_en_us" };
  assert.notEqual(invoiceV1Definition.name, v2.name);
  assert.equal(invoiceV1Definition.version, 1);
  assert.equal(v2.version, 2);
});

test("normalizes template provider failures to TEMPLATE_SYNC_FAILED", async () => {
  const { meta, service } = fixture();
  meta.listMessageTemplates = async () => { throw new WhatsAppError("META_PROVIDER_FAILED", "provider detail", { details: { httpStatus: 500, traceId: "trace-1" } }); };
  await assert.rejects(service.reconcileInvoiceV1({ organizationId: "org-1" }), (error: unknown) =>
    error instanceof WhatsAppError && error.code === "TEMPLATE_SYNC_FAILED" && error.message === "WhatsApp templates could not be synchronized" && error.details?.traceId === "trace-1"
  );
});
