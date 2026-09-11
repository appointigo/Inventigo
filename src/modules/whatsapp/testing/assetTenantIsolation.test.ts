import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppAssetService } from "../services/WhatsAppAssetService.ts";

test("business-account reads always include the authenticated organization", async () => {
  let captured: unknown;
  const prisma = { whatsAppBusinessAccount: { findMany: async (query: unknown) => { captured = query; return []; } } } as unknown as PrismaClient;
  await new WhatsAppAssetService(prisma).listBusinessAccounts("org-a");
  assert.deepEqual((captured as { where: unknown }).where, { integration: { organizationId: "org-a" } });
});

test("phone detail cannot return another organization's asset", async () => {
  let captured: unknown;
  const prisma = { whatsAppPhoneNumber: { findFirst: async (query: unknown) => { captured = query; return null; } } } as unknown as PrismaClient;
  await assert.rejects(new WhatsAppAssetService(prisma).getPhoneNumber("org-b", "phone-from-org-a"), (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "EMBEDDED_SIGNUP_ASSET_MISMATCH");
  assert.deepEqual((captured as { where: unknown }).where, { id: "phone-from-org-a", waba: { integration: { organizationId: "org-b" } } });
});

test("last-account disconnect removes only local access and is idempotent", async () => {
  let credentialRef: string | null = "db://whatsapp-credentials/credential-1";
  const integrationUpdates: Array<Record<string, unknown>> = [];
  const removed: Array<{ credentialRef: string; organizationId: string }> = [];
  const tx = {
    storeWhatsAppSender: { updateMany: async () => ({ count: 1 }) },
    whatsAppPhoneNumber: { updateMany: async () => ({ count: 1 }) },
    whatsAppBusinessAccount: {
      update: async () => ({ id: "waba-1" }),
      count: async () => 0,
      findUniqueOrThrow: async () => ({ integrationId: "integration-1" }),
    },
    whatsAppIntegration: {
      findUniqueOrThrow: async () => ({ id: "integration-1", credentialRef }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        integrationUpdates.push(data);
        credentialRef = data.credentialRef as null;
        return { id: "integration-1" };
      },
    },
  };
  const prisma = {
    whatsAppBusinessAccount: { findFirst: async () => ({ id: "waba-1" }) },
    $transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
  } as unknown as PrismaClient;
  const credentials = {
    save: async () => "unused",
    resolve: async () => "unused",
    remove: async (ref: string, organizationId: string) => { removed.push({ credentialRef: ref, organizationId }); },
  };
  const service = new WhatsAppAssetService(prisma, undefined, credentials);

  const first = await service.disconnectBusinessAccount("org-a", "waba-1");
  const second = await service.disconnectBusinessAccount("org-a", "waba-1");

  assert.equal(first.disconnectMode, "LOCAL_ONLY");
  assert.equal(first.localCredentialRemoved, true);
  assert.equal(second.localCredentialRemoved, false);
  assert.deepEqual(removed, [{ credentialRef: "db://whatsapp-credentials/credential-1", organizationId: "org-a" }]);
  assert.equal(integrationUpdates.every(update => update.status === "DISCONNECTED" && update.credentialRef === null), true);
  assert.deepEqual(first.externalMeta, { assetsChanged: false, appSubscriptionChanged: false, permissionsRevoked: false });
});
