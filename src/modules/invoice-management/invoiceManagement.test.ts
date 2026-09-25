import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { invoiceManagementSettingsSchema, invoiceManagementSettingsUpdateSchema } from "./schemas.ts";
import { resolveInvoiceConfigurationSnapshot } from "./services/invoiceConfigurationSnapshot.ts";

test("automatic delivery requires an approved sale-template selection", () => {
  const result = invoiceManagementSettingsSchema.safeParse({
    designKey: "CLASSIC",
    defaultWhatsAppEnabled: true,
    termsText: null,
    returnPolicyText: null,
    thankYouMessage: null,
    saleTemplateInstanceId: null,
    exchangeTemplateInstanceId: null,
  });
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error?.issues), /approved default sale template/);
});

test("accepts the original design-only payload without requiring delivery preferences", () => {
  const result = invoiceManagementSettingsUpdateSchema.safeParse({ designKey: "PREMIUM" });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { designKey: "PREMIUM" });
});

test("accepts the original default-template payload without unrelated settings", () => {
  const payload = {
    saleTemplateInstanceId: "11111111-1111-4111-8111-111111111111",
  };
  const result = invoiceManagementSettingsUpdateSchema.safeParse(payload);
  assert.equal(result.success, true);
  assert.deepEqual(result.data, payload);
});

test("preserves explicit false while allowing delivery preferences to be omitted", () => {
  const disabled = invoiceManagementSettingsUpdateSchema.parse({
    defaultWhatsAppEnabled: false,
  });
  const omitted = invoiceManagementSettingsUpdateSchema.parse({
    termsText: "Updated terms",
  });
  assert.equal(disabled.defaultWhatsAppEnabled, false);
  assert.equal("defaultWhatsAppEnabled" in omitted, false);
});

test("resolves a store-isolated immutable invoice configuration snapshot", async () => {
  let receivedWhere: unknown;
  const prisma = {
    store: {
      findFirst: async ({ where }: { where: unknown }) => {
        receivedWhere = where;
        return {
          invoiceSettings: {
            designKey: "PREMIUM",
            activePolicyVersion: {
              id: "policy-7",
              version: 7,
              effectiveFrom: new Date("2026-09-25T00:00:00.000Z"),
              termsText: "Snapshot terms",
              returnPolicyText: "Snapshot returns",
              thankYouMessage: "Snapshot thanks",
            },
          },
        };
      },
    },
  } as unknown as PrismaClient;

  const snapshot = await resolveInvoiceConfigurationSnapshot(prisma, "org-1", "store-1");
  assert.deepEqual(receivedWhere, { id: "store-1", orgId: "org-1" });
  assert.equal(snapshot.design.key, "PREMIUM");
  assert.equal(snapshot.policyVersionId, "policy-7");
  assert.equal(snapshot.policy.termsText, "Snapshot terms");
});
