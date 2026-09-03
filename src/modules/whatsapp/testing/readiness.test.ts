import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppMessagingReadinessService } from "../services/WhatsAppMessagingReadinessService.ts";

function fixture(options: { integrationStatus?: string; wabaStatus?: string; phoneStatus?: string; mapping?: boolean; template?: boolean } = {}) {
  const seen: unknown[] = [];
  const prisma = {
    store: { findFirst: async (query: unknown) => { seen.push(query); return { id: "store-1" }; } },
    whatsAppIntegration: { findUnique: async (query: unknown) => { seen.push(query); return options.integrationStatus === undefined ? null : { status: options.integrationStatus, businessAccounts: [{ id: "waba-1", status: options.wabaStatus ?? "ACTIVE", phoneNumbers: [{ id: "phone-1", status: options.phoneStatus ?? "ACTIVE", qualityRating: "GREEN" }] }] }; } },
    storeWhatsAppSender: { findMany: async (query: unknown) => { seen.push(query); return options.mapping ? [{ purpose: "TRANSACTIONAL", isDefault: true, phoneNumberId: "phone-1", phoneNumber: { wabaId: "waba-1" } }] : []; } },
    whatsAppTemplateInstance: { findFirst: async (query: unknown) => { seen.push(query); return options.template ? { id: "template-1" } : null; } },
  } as unknown as PrismaClient;
  return { seen, service: new WhatsAppMessagingReadinessService(prisma) };
}

test("returns READY only for a complete purpose-specific tenant path", async () => {
  const { service, seen } = fixture({ integrationStatus: "CONNECTED", mapping: true, template: true });
  const result = await service.getMessagingReadiness({ organizationId: "org-a", storeId: "store-1", purpose: "TRANSACTIONAL" });
  assert.equal(result.overallStatus, "READY");
  assert.equal(result.checks.every(check => check.passed), true);
  assert.match(JSON.stringify(seen), /org-a/);
});

test("returns actionable blockers and never fabricates billing readiness", async () => {
  const { service } = fixture({ integrationStatus: "CONNECTED" });
  const result = await service.getMessagingReadiness({ organizationId: "org-a", purpose: "TRANSACTIONAL" });
  assert.equal(result.overallStatus, "SETUP_IN_PROGRESS");
  assert.ok(result.blockingReasons.length > 0);
  assert.equal(result.recommendedActions.every(action => Boolean(action.label && action.href)), true);
  assert.equal("billingReady" in result.providerSignals, false);
});

test("authoritative provider action state prevents READY", async () => {
  const { service } = fixture({ integrationStatus: "ACTION_REQUIRED", mapping: true, template: true });
  const result = await service.getMessagingReadiness({ organizationId: "org-a", purpose: "TRANSACTIONAL" });
  assert.equal(result.overallStatus, "ACTION_REQUIRED");
});

test("support readiness does not require an invoice template", async () => {
  const { service } = fixture({ integrationStatus: "CONNECTED", template: false });
  (service as unknown as { prisma: { storeWhatsAppSender: { findMany: () => Promise<unknown[]> } } }).prisma.storeWhatsAppSender.findMany = async () => [{ purpose: "SUPPORT", isDefault: true, phoneNumberId: "phone-1", phoneNumber: { wabaId: "waba-1" } }];
  const result = await service.getMessagingReadiness({ organizationId: "org-a", purpose: "SUPPORT" });
  assert.equal(result.overallStatus, "READY");
  assert.equal(result.checks.some(check => check.key === "template"), false);
});
