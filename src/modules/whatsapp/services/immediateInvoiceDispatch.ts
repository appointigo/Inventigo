import "server-only";

import type { PrismaClient } from "@prisma/client";

export const DEFAULT_INVOICE_DISPATCH_WAIT_MS = 8_000;
const MAX_INVOICE_DISPATCH_WAIT_MS = 15_000;

export type ImmediateInvoiceDeliveryState = {
  id: string;
  status: "QUEUED" | "SUBMITTED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  phase: "QUEUED" | "PROCESSING" | "META_SUBMITTED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  errorCode: string | null;
  errorMessage: string | null;
  timedOut?: boolean;
};

type PersistedDelivery = {
  id: string;
  status: ImmediateInvoiceDeliveryState["status"];
  dispatchClaimedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type InvoiceDispatcher = {
  processMessage(messageId: string): Promise<unknown>;
};

const deliverySelect = {
  id: true,
  status: true,
  dispatchClaimedAt: true,
  errorCode: true,
  errorMessage: true,
} as const;

function phaseFor(delivery: PersistedDelivery): ImmediateInvoiceDeliveryState["phase"] {
  if (delivery.status === "QUEUED") {
    return delivery.dispatchClaimedAt ? "PROCESSING" : "QUEUED";
  }
  if (delivery.status === "SUBMITTED") return "META_SUBMITTED";
  return delivery.status;
}

function toDeliveryState(
  delivery: PersistedDelivery,
  options?: { timedOut?: boolean }
): ImmediateInvoiceDeliveryState {
  return {
    id: delivery.id,
    status: delivery.status,
    phase: phaseFor(delivery),
    errorCode: delivery.errorCode,
    errorMessage: delivery.errorMessage,
    ...(options?.timedOut ? { timedOut: true } : {}),
  };
}

function unavailableDeliveryState(
  messageId: string,
  options?: { timedOut?: boolean }
): ImmediateInvoiceDeliveryState {
  return {
    id: messageId,
    status: "QUEUED",
    phase: "PROCESSING",
    errorCode: "INVOICE_DELIVERY_STATUS_UNAVAILABLE",
    errorMessage: "Billing completed, but the current invoice delivery status could not be read.",
    ...(options?.timedOut ? { timedOut: true } : {}),
  };
}

function dispatchWaitMs(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.WHATSAPP_INVOICE_INITIAL_WAIT_MS?.trim();
  if (!raw) return DEFAULT_INVOICE_DISPATCH_WAIT_MS;
  const configured = Number(raw);
  if (!Number.isInteger(configured) || configured < 0) {
    return DEFAULT_INVOICE_DISPATCH_WAIT_MS;
  }
  return Math.min(configured, MAX_INVOICE_DISPATCH_WAIT_MS);
}

function configurationFailure(error: unknown) {
  if (
    error instanceof Error &&
    error.name === "WhatsAppPlatformConfigurationError" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return {
      code: error.code,
      message: error.message,
    };
  }
  return {
    code: "INVOICE_DISPATCH_START_FAILED",
    message:
      error instanceof Error ? error.message.slice(0, 500) : "Invoice dispatch could not start",
  };
}

export function beginImmediateInvoiceDispatch(
  prisma: PrismaClient,
  messageId: string,
  createDispatcher: () => InvoiceDispatcher,
  options?: { waitMs?: number }
) {
  const completion = (async (): Promise<ImmediateInvoiceDeliveryState> => {
    try {
      await createDispatcher().processMessage(messageId);
    } catch (error) {
      // processMessage persists failures after it has claimed a record. This update
      // covers failures that happen before the dispatcher can be constructed, most
      // importantly missing or invalid platform configuration.
      const failure = configurationFailure(error);
      try {
        await prisma.whatsAppMessage.updateMany({
          where: {
            id: messageId,
            purpose: "INVOICE",
            direction: "OUTBOUND",
            status: "QUEUED",
            metaMessageId: null,
            dispatchClaimedAt: null,
          },
          data: {
            status: "FAILED",
            errorCode: failure.code,
            errorMessage: failure.message,
            failedAt: new Date(),
          },
        });
      } catch (persistenceError) {
        console.warn("[WhatsApp Invoice] dispatch_failure_persistence_failed", {
          deliveryId: messageId,
          errorCode: failure.code,
          persistenceError:
            persistenceError instanceof Error ? persistenceError.name : "UNKNOWN_ERROR",
        });
      }
    }

    try {
      const delivery = await prisma.whatsAppMessage.findUniqueOrThrow({
        where: { id: messageId },
        select: deliverySelect,
      });
      return toDeliveryState(delivery);
    } catch {
      // A post-commit status-read outage must not turn a committed bill into an
      // HTTP failure. The durable delivery record remains the source of truth.
      return unavailableDeliveryState(messageId);
    }
  })();

  const initial = (async (): Promise<ImmediateInvoiceDeliveryState> => {
    const waitMs = Math.min(
      Math.max(options?.waitMs ?? dispatchWaitMs(), 0),
      MAX_INVOICE_DISPATCH_WAIT_MS
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timeout = setTimeout(() => resolve(null), waitMs);
    });
    const settled = await Promise.race([completion, timedOut]);
    if (timeout) clearTimeout(timeout);
    if (settled) return settled;

    try {
      const delivery = await prisma.whatsAppMessage.findUniqueOrThrow({
        where: { id: messageId },
        select: deliverySelect,
      });
      return toDeliveryState(delivery, { timedOut: true });
    } catch {
      return unavailableDeliveryState(messageId, { timedOut: true });
    }
  })();

  return { initial, completion };
}
