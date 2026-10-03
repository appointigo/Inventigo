import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppStoreConfigurationService } from "../services/WhatsAppStoreConfigurationService.ts";

const input = {
  storeId: "store-a",
  phoneNumberId: "phone-a",
  purpose: "TRANSACTIONAL" as const,
  priority: 10,
  isDefault: true,
  isActive: true,
};

test("mapping rejects a phone number outside the organization", async () => {
  const prisma = {
    store: { findFirst: async () => ({ id: "store-a", isActive: true }) },
    whatsAppPhoneNumber: { findFirst: async () => null },
  } as unknown as PrismaClient;
  await assert.rejects(
    new WhatsAppStoreConfigurationService(prisma).createMapping("org-a", input),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "PHONE_NOT_FOUND"
  );
});

test("making a sender default clears the previous default only for that Store purpose", async () => {
  let clearedWhere: unknown;
  const transaction = {
    storeWhatsAppSender: {
      updateMany: async (query: { where: unknown }) => {
        clearedWhere = query.where;
      },
      create: async ({ data }: { data: unknown }) => data,
    },
  };
  const prisma = {
    store: { findFirst: async () => ({ id: "store-a", isActive: true }) },
    whatsAppPhoneNumber: {
      findFirst: async () => ({
        id: "phone-a",
        status: "ACTIVE",
        waba: { status: "ACTIVE", integration: { status: "CONNECTED" } },
      }),
    },
    storeWhatsAppSender: { findUnique: async () => null },
    $transaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as unknown as PrismaClient;
  await new WhatsAppStoreConfigurationService(prisma).createMapping("org-a", input);
  assert.deepEqual(clearedWhere, { storeId: "store-a", purpose: "TRANSACTIONAL", isDefault: true });
});

test("Store profile lookup is organization scoped", async () => {
  let where: unknown;
  const prisma = {
    store: {
      findFirst: async (query: { where: unknown }) => {
        where = query.where;
        return { id: "store-a", name: "Main", code: "MAIN", whatsappProfile: null };
      },
    },
  } as unknown as PrismaClient;
  await new WhatsAppStoreConfigurationService(prisma).getProfile("org-a", "store-a");
  assert.deepEqual(where, { id: "store-a", orgId: "org-a" });
});
