import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  InvoiceManagementService,
  InvoiceManagementValidationError,
} from "./services/invoiceManagementService.ts";

const saleTemplateA = "11111111-1111-4111-8111-111111111111";
const saleTemplateB = "22222222-2222-4222-8222-222222222222";
const exchangeTemplateA = "33333333-3333-4333-8333-333333333333";
const exchangeTemplateB = "44444444-4444-4444-8444-444444444444";

function fakePersistence(options?: { organizationId?: string; invalidTemplateId?: string }) {
  const organizationId = options?.organizationId ?? "org-1";
  const policies = [{
    id: "policy-1",
    storeId: "store-1",
    version: 1,
    termsText: "Original terms",
    returnPolicyText: "Original returns",
    thankYouMessage: "Original thanks",
    effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
  }];
  const state = {
    settings: {
      storeId: "store-1",
      designKey: "PREMIUM",
      designVersion: 1,
      defaultWhatsAppEnabled: true,
      activePolicyVersionId: "policy-1" as string | null,
    },
    profile: {
      defaultInvoiceTemplateInstanceId: saleTemplateA as string | null,
      defaultExchangeInvoiceTemplateInstanceId: exchangeTemplateA as string | null,
    },
    policies,
    validatedTemplates: [] as string[],
  };
  const activePolicy = () =>
    state.policies.find(policy => policy.id === state.settings.activePolicyVersionId) ?? null;
  const storeResult = (where: { id?: string; orgId?: string; isActive?: boolean }) => {
    if (where.id !== "store-1" || where.orgId !== organizationId) return null;
    return {
      id: "store-1",
      name: "Test Store",
      isActive: true,
      invoiceSettings: { ...state.settings, activePolicyVersion: activePolicy() },
      whatsappProfile: { ...state.profile },
    };
  };
  const tx = {
    storeInvoiceSettings: {
      findUnique: async () => ({ ...state.settings, activePolicyVersion: activePolicy() }),
      upsert: async ({ create, update }: { create: typeof state.settings; update: Partial<typeof state.settings> }) => {
        state.settings = state.settings ? { ...state.settings, ...update } : create;
        return state.settings;
      },
    },
    invoicePolicyVersion: {
      aggregate: async () => ({ _max: { version: Math.max(...state.policies.map(policy => policy.version)) } }),
      create: async ({ data }: { data: Omit<(typeof policies)[number], "id"> }) => {
        const policy = { id: `policy-${data.version}`, ...data };
        state.policies.push(policy);
        return { id: policy.id };
      },
    },
    storeWhatsAppProfile: {
      upsert: async ({ create, update }: {
        create: typeof state.profile & { storeId: string; displayName: string; defaultLanguage: string };
        update: Partial<typeof state.profile>;
      }) => {
        state.profile = { ...state.profile, ...(state.profile ? update : create) };
        return state.profile;
      },
    },
  };
  const prisma = {
    store: { findFirst: async ({ where }: { where: { id?: string; orgId?: string; isActive?: boolean } }) => storeResult(where) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  const validator = {
    assertEligible: async (_orgId: string, _storeId: string, templateId: string) => {
      state.validatedTemplates.push(templateId);
      if (templateId === options?.invalidTemplateId) throw new Error("INVOICE_TEMPLATE_NOT_ELIGIBLE");
      return {};
    },
  };
  return { state, service: new InvoiceManagementService(prisma, validator) };
}

test("saving an invoice design preserves policy, templates, and delivery preference", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { designKey: "COMPACT" });
  assert.equal(state.settings.designKey, "COMPACT");
  assert.equal(state.settings.defaultWhatsAppEnabled, true);
  assert.equal(state.settings.activePolicyVersionId, "policy-1");
  assert.equal(state.profile.defaultInvoiceTemplateInstanceId, saleTemplateA);
  assert.equal(state.profile.defaultExchangeInvoiceTemplateInstanceId, exchangeTemplateA);
});

test("updating terms creates a version while preserving WhatsApp defaults", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { termsText: "Updated terms" });
  assert.equal(state.policies.at(-1)?.termsText, "Updated terms");
  assert.equal(state.policies.at(-1)?.returnPolicyText, "Original returns");
  assert.equal(state.profile.defaultInvoiceTemplateInstanceId, saleTemplateA);
  assert.equal(state.profile.defaultExchangeInvoiceTemplateInstanceId, exchangeTemplateA);
});

test("changing the default sales template preserves design and policy", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { saleTemplateInstanceId: saleTemplateB });
  assert.equal(state.profile.defaultInvoiceTemplateInstanceId, saleTemplateB);
  assert.equal(state.profile.defaultExchangeInvoiceTemplateInstanceId, exchangeTemplateA);
  assert.equal(state.settings.designKey, "PREMIUM");
  assert.equal(state.settings.activePolicyVersionId, "policy-1");
});

test("changing the default exchange template preserves the sales template", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { exchangeTemplateInstanceId: exchangeTemplateB });
  assert.equal(state.profile.defaultInvoiceTemplateInstanceId, saleTemplateA);
  assert.equal(state.profile.defaultExchangeInvoiceTemplateInstanceId, exchangeTemplateB);
});

test("explicit false disables automatic delivery", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { defaultWhatsAppEnabled: false });
  assert.equal(state.settings.defaultWhatsAppEnabled, false);
});

test("omitting delivery preferences leaves the existing value unchanged", async () => {
  const { state, service } = fakePersistence();
  await service.save("org-1", "store-1", { thankYouMessage: "New thanks" });
  assert.equal(state.settings.defaultWhatsAppEnabled, true);
});

test("a Store outside the authenticated organization cannot be updated", async () => {
  const { service } = fakePersistence({ organizationId: "org-2" });
  await assert.rejects(
    service.save("org-1", "store-1", { designKey: "CLASSIC" }),
    /STORE_NOT_FOUND/
  );
});

test("an invalid template returns a field-specific validation error", async () => {
  const { service } = fakePersistence({ invalidTemplateId: saleTemplateB });
  await assert.rejects(
    service.save("org-1", "store-1", { saleTemplateInstanceId: saleTemplateB }),
    (error: unknown) => {
      assert.ok(error instanceof InvoiceManagementValidationError);
      assert.equal(error.field, "saleTemplateInstanceId");
      assert.match(error.message, /approved, compatible DOCUMENT-header sale template/);
      return true;
    }
  );
});

test("an enabled delivery preference cannot lose its sales template", async () => {
  const { service } = fakePersistence();
  await assert.rejects(
    service.save("org-1", "store-1", { saleTemplateInstanceId: null }),
    (error: unknown) => {
      assert.ok(error instanceof InvoiceManagementValidationError);
      assert.equal(error.field, "saleTemplateInstanceId");
      return true;
    }
  );
});
