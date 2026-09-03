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
