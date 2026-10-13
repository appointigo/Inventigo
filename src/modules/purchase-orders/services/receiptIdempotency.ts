import { createHash } from "crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function receiptPayloadHash(purchaseOrderId: string, payload: unknown) {
  const normalizedPayload = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (() => {
        const record = payload as Record<string, unknown>;
        const items = Array.isArray(record.items)
          ? [...record.items].sort((left, right) => JSON.stringify(canonicalize(left)).localeCompare(JSON.stringify(canonicalize(right))))
          : record.items;
        return { ...record, items };
      })()
    : payload;
  return createHash("sha256")
    .update(JSON.stringify(canonicalize({ purchaseOrderId, payload: normalizedPayload })))
    .digest("hex");
}

export class ReceiptIdempotencyConflictError extends Error {
  readonly status = 409;

  constructor() {
    super("This receipt confirmation ID was already used with a different payload");
    this.name = "ReceiptIdempotencyConflictError";
  }
}
