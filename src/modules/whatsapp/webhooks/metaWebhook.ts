import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: { details?: string };
  }>;
};
export type ParsedMetaStatus = { wabaId: string; phoneNumberId?: string; status: MetaStatus };
export type MetaInboundMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  context?: { id?: string };
  [key: string]: unknown;
};
export type ParsedMetaInboundMessage = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  profileName?: string;
  message: MetaInboundMessage;
};

export function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    createHmac("sha256", appSecret).update(rawBody).digest("hex"),
    "utf8"
  );
  const received = Buffer.from(signature.slice(7), "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function parseMetaStatuses(payload: unknown): ParsedMetaStatus[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { object?: unknown }).object !== "whatsapp_business_account"
  )
    return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];
  const output: ParsedMetaStatus[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const wabaId = String((entry as { id?: unknown }).id ?? "");
    const changes = (entry as { changes?: unknown }).changes;
    if (!wabaId || !Array.isArray(changes)) continue;
    for (const change of changes) {
      if (
        !change ||
        typeof change !== "object" ||
        (change as { field?: unknown }).field !== "messages"
      )
        continue;
      const value = (
        change as { value?: { statuses?: unknown; metadata?: { phone_number_id?: unknown } } }
      ).value;
      if (!Array.isArray(value?.statuses)) continue;
      for (const candidate of value.statuses) {
        if (!candidate || typeof candidate !== "object") continue;
        const status = candidate as MetaStatus;
        if (
          typeof status.id === "string" &&
          typeof status.timestamp === "string" &&
          ["sent", "delivered", "read", "failed"].includes(status.status)
        )
          output.push({
            wabaId,
            phoneNumberId:
              typeof value?.metadata?.phone_number_id === "string"
                ? value.metadata.phone_number_id
                : undefined,
            status,
          });
      }
    }
  }
  return output;
}

export function parseMetaInboundMessages(payload: unknown): ParsedMetaInboundMessage[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { object?: unknown }).object !== "whatsapp_business_account"
  )
    return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];
  const output: ParsedMetaInboundMessage[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const wabaId = String((entry as { id?: unknown }).id ?? "");
    const changes = (entry as { changes?: unknown }).changes;
    if (!wabaId || !Array.isArray(changes)) continue;
    for (const change of changes) {
      if (
        !change ||
        typeof change !== "object" ||
        (change as { field?: unknown }).field !== "messages"
      )
        continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") continue;
      const metadata = (
        value as { metadata?: { phone_number_id?: unknown; display_phone_number?: unknown } }
      ).metadata;
      const phoneNumberId =
        typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : "";
      const messages = (value as { messages?: unknown }).messages;
      if (!phoneNumberId || !Array.isArray(messages)) continue;
      const contacts = (value as { contacts?: unknown }).contacts;
      for (const candidate of messages) {
        if (!candidate || typeof candidate !== "object") continue;
        const message = candidate as MetaInboundMessage;
        if (
          typeof message.id !== "string" ||
          typeof message.from !== "string" ||
          typeof message.timestamp !== "string" ||
          typeof message.type !== "string"
        )
          continue;
        const matchingContact = Array.isArray(contacts)
          ? contacts.find(
              (contact) =>
                contact &&
                typeof contact === "object" &&
                (contact as { wa_id?: unknown }).wa_id === message.from
            )
          : undefined;
        const profile =
          matchingContact && typeof matchingContact === "object"
            ? (matchingContact as { profile?: { name?: unknown } }).profile
            : undefined;
        output.push({
          wabaId,
          phoneNumberId,
          displayPhoneNumber:
            typeof metadata?.display_phone_number === "string"
              ? metadata.display_phone_number
              : undefined,
          profileName: typeof profile?.name === "string" ? profile.name : undefined,
          message,
        });
      }
    }
  }
  return output;
}

export function verifyWebhookChallenge(
  input: { mode: string | null; token: string | null; challenge: string | null },
  verifyToken: string
) {
  return input.mode === "subscribe" && input.token === verifyToken && Boolean(input.challenge)
    ? input.challenge
    : null;
}
