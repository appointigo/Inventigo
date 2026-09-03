import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppAutomationService } from "../services/WhatsAppAutomationService.ts";

test("inactive-customer events record a consent skip with an idempotent event key", async () => {
  let create: Record<string, unknown> | undefined;
  const db = {
    whatsAppAutomation: { findMany: async () => [{ id: "auto-1", conditions: {} }] },
    whatsAppContact: {
      findFirst: async () => ({
        id: "contact-1",
        normalizedPhone: "+12025550111",
        consents: [{ purpose: "MARKETING", status: "PENDING" }],
      }),
    },
    whatsAppAutomationExecution: {
      upsert: async (x: { create: Record<string, unknown> }) => {
        create = x.create;
        return x.create;
      },
    },
  } as unknown as PrismaClient;
  await new WhatsAppAutomationService(db).emit({
    organizationId: "org-1",
    storeId: "store-1",
    trigger: "CUSTOMER_INACTIVE",
    subjectType: "CUSTOMER",
    subjectId: "customer-1",
    customerId: "customer-1",
    occurredAt: new Date("2026-01-01"),
  });
  assert.equal(create?.eventKey, "CUSTOMER_INACTIVE:customer-1");
  assert.equal(create?.status, "SKIPPED");
  assert.equal(create?.skipReason, "MARKETING_CONSENT_REQUIRED");
});

test("non-matching amount conditions are recorded rather than silently dropped", async () => {
  let create: Record<string, unknown> | undefined;
  const db = {
    whatsAppAutomation: {
      findMany: async () => [{ id: "auto-1", conditions: { minAmount: 500 } }],
    },
    whatsAppContact: {
      findFirst: async () => ({ id: "contact-1", normalizedPhone: "+1", consents: [] }),
    },
    whatsAppAutomationExecution: {
      upsert: async (x: { create: Record<string, unknown> }) => {
        create = x.create;
        return x.create;
      },
    },
  } as unknown as PrismaClient;
  await new WhatsAppAutomationService(db).emit({
    organizationId: "org-1",
    storeId: "store-1",
    trigger: "SALE_COMPLETED",
    subjectType: "SALE",
    subjectId: "sale-1",
    customerId: "customer-1",
    amount: 100,
    occurredAt: new Date(),
  });
  assert.equal(create?.skipReason, "CONDITION_NOT_MATCHED");
});
