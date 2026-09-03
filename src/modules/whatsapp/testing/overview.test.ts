import assert from "node:assert/strict";
import test from "node:test";
import { buildSetupProgress, canSyncWhatsApp, deriveWhatsAppReadiness, type OverviewEvidence } from "../overview.ts";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppOverviewService } from "../services/WhatsAppOverviewService.ts";

const complete: OverviewEvidence = {
  connectionStatus: "CONNECTED",
  activeWabas: 1,
  activePhones: 1,
  activeMappings: 1,
  approvedTemplates: 1,
  configuredProfiles: 1,
};
test("readiness is Ready only when the complete sending path exists", () => {
  assert.equal(deriveWhatsAppReadiness(complete), "READY");
  for (const key of ["activeWabas", "activePhones", "activeMappings", "approvedTemplates"] as const)
    assert.equal(deriveWhatsAppReadiness({ ...complete, [key]: 0 }), "SETUP_IN_PROGRESS");
});
test("provider action state overrides otherwise complete configuration", () => {
  assert.equal(
    deriveWhatsAppReadiness({ ...complete, connectionStatus: "ACTION_REQUIRED" }),
    "ACTION_REQUIRED"
  );
});
test("sync is unavailable before connection and available for persisted integration states", () => {
  assert.equal(canSyncWhatsApp(undefined), false);
  assert.equal(canSyncWhatsApp("NOT_CONNECTED"), false);
  assert.equal(canSyncWhatsApp("CONNECTED"), true);
  assert.equal(canSyncWhatsApp("ACTION_REQUIRED"), true);
  assert.equal(canSyncWhatsApp("DISCONNECTED"), true);
});
test("setup progress is normalized and never inferred from percentages", () => {
  assert.deepEqual(buildSetupProgress(complete), {
    completed: 6,
    total: 6,
    percent: 100,
    steps: [
      { key: "connection", label: "Meta connected", complete: true },
      { key: "waba", label: "Active business account", complete: true },
      { key: "phone", label: "Active phone number", complete: true },
      { key: "mapping", label: "Store sender mapped", complete: true },
      { key: "profile", label: "Store profile configured", complete: true },
      { key: "template", label: "Approved template available", complete: true },
    ],
  });
});

test("overview queries are organization scoped", async () => {
  const where: unknown[] = [];
  const prisma = {
    whatsAppIntegration: {
      findUnique: async (query: { where: unknown }) => {
        where.push(query.where);
        return null;
      },
    },
    storeWhatsAppSender: {
      findMany: async (query: { where: unknown }) => {
        where.push(query.where);
        return [];
      },
    },
    whatsAppTemplateInstance: {
      findMany: async (query: { where: unknown }) => {
        where.push(query.where);
        return [];
      },
    },
    storeWhatsAppProfile: {
      findMany: async (query: { where: unknown }) => {
        where.push(query.where);
        return [];
      },
    },
  } as unknown as PrismaClient;
  const readiness = { getMessagingReadiness: async () => ({ overallStatus: "NOT_CONNECTED" }) };
  const result = await new WhatsAppOverviewService(prisma, readiness as never).get("org-a");
  assert.equal(result.readiness, "NOT_CONNECTED");
  assert.match(JSON.stringify(where), /org-a/);
  assert.equal(JSON.stringify(where).includes("organizationId"), true);
  assert.equal(JSON.stringify(where).includes("orgId"), true);
});
