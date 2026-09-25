import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { beginImmediateInvoiceDispatch } from "../services/immediateInvoiceDispatch.ts";

function fakePrisma() {
  const state = {
    id: "delivery-1",
    status: "QUEUED" as "QUEUED" | "SUBMITTED" | "FAILED",
    dispatchClaimedAt: null as Date | null,
    metaMessageId: null as string | null,
    errorCode: null as string | null,
    errorMessage: null as string | null,
  };
  return {
    state,
    client: {
      whatsAppMessage: {
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          if (state.status !== "QUEUED" || state.dispatchClaimedAt) return { count: 0 };
          Object.assign(state, data);
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({ ...state }),
      },
    } as unknown as PrismaClient,
  };
}

test("returns processing after the bounded wait while the same dispatch keeps running", async () => {
  const prisma = fakePrisma();
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const dispatch = beginImmediateInvoiceDispatch(
    prisma.client,
    "delivery-1",
    () => ({
      async processMessage() {
        prisma.state.dispatchClaimedAt = new Date();
        await blocked;
        prisma.state.status = "SUBMITTED";
        prisma.state.metaMessageId = "meta-1";
      },
    }),
    { waitMs: 1 }
  );

  const initial = await dispatch.initial;
  assert.equal(initial.status, "QUEUED");
  assert.equal(initial.phase, "PROCESSING");
  assert.equal(initial.timedOut, true);

  finish();
  const completed = await dispatch.completion;
  assert.equal(completed.status, "SUBMITTED");
  assert.equal(completed.phase, "META_SUBMITTED");
});

test("persists dispatcher configuration errors instead of leaving the invoice queued", async () => {
  const prisma = fakePrisma();
  const dispatch = beginImmediateInvoiceDispatch(
    prisma.client,
    "delivery-1",
    () => {
      const error = new Error(
        "Required WhatsApp configuration is missing: META_APP_SECRET"
      ) as Error & { code: string };
      error.name = "WhatsAppPlatformConfigurationError";
      error.code = "WHATSAPP_CONFIGURATION_MISSING";
      throw error;
    },
    { waitMs: 100 }
  );

  const initial = await dispatch.initial;
  assert.equal(initial.status, "FAILED");
  assert.equal(initial.phase, "FAILED");
  assert.equal(initial.errorCode, "WHATSAPP_CONFIGURATION_MISSING");
  assert.match(initial.errorMessage ?? "", /META_APP_SECRET/);
});

test("a post-commit status read failure does not reject the billing dispatch handoff", async () => {
  const client = {
    whatsAppMessage: {
      updateMany: async () => ({ count: 0 }),
      findUniqueOrThrow: async () => {
        throw new Error("DATABASE_UNAVAILABLE");
      },
    },
  } as unknown as PrismaClient;
  const dispatch = beginImmediateInvoiceDispatch(
    client,
    "delivery-1",
    () => ({
      async processMessage() {},
    }),
    { waitMs: 100 }
  );

  const initial = await dispatch.initial;
  assert.equal(initial.status, "QUEUED");
  assert.equal(initial.phase, "PROCESSING");
  assert.equal(initial.errorCode, "INVOICE_DELIVERY_STATUS_UNAVAILABLE");
});
