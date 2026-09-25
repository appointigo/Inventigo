export const INVOICE_SMOKE_TEST_CONFIRMATION = "SEND_SINGLE_WHATSAPP_INVOICE";

export type InvoiceSmokeCandidate = {
  id: string;
  purpose: string;
  direction: string;
  status: string;
  dispatchClaimedAt: Date | null;
  metaMessageId: string | null;
  payload: unknown;
};

type SmokePayload = {
  invoiceDelivery?: {
    reference?: string;
    recipient?: string;
  };
  outboundContent?: unknown;
  diagnostic?: {
    mediaIdPresent?: boolean;
    providerError?: unknown;
  };
};

export type InvoiceSmokeTestConfig = {
  allowedDeliveryId?: string;
  allowedRecipient?: string;
  requestedDeliveryId: string;
  expectedReference?: string;
  confirmation?: string;
  transactionalConsentGranted?: boolean;
};

const asPayload = (value: unknown): SmokePayload =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as SmokePayload
    : {};

const normalizeRecipient = (value: string | undefined) => value?.replace(/\D/g, "") ?? "";

export function inspectInvoiceSmokeCandidate(
  candidate: InvoiceSmokeCandidate | null,
  config: InvoiceSmokeTestConfig
) {
  const reasons: string[] = [];
  if (!config.allowedDeliveryId || !config.allowedRecipient) reasons.push("SMOKE_TEST_NOT_CONFIGURED");
  if (config.allowedDeliveryId !== config.requestedDeliveryId) reasons.push("DELIVERY_NOT_ALLOWLISTED");
  if (!candidate) {
    reasons.push("INVOICE_DELIVERY_NOT_FOUND");
    return { eligible: false, reasons };
  }

  const payload = asPayload(candidate.payload);
  const invoice = payload.invoiceDelivery;
  if (candidate.purpose !== "INVOICE" || candidate.direction !== "OUTBOUND") reasons.push("NOT_OUTBOUND_INVOICE");
  if (candidate.status !== "QUEUED") reasons.push("DELIVERY_NOT_QUEUED");
  if (candidate.dispatchClaimedAt) reasons.push("DELIVERY_ALREADY_CLAIMED");
  if (candidate.metaMessageId) reasons.push("PROVIDER_MESSAGE_ALREADY_PRESENT");
  if (payload.outboundContent) reasons.push("OUTBOUND_CONTENT_ALREADY_PRESENT");
  if (payload.diagnostic?.mediaIdPresent) reasons.push("MEDIA_UPLOAD_ALREADY_PRESENT");
  if (payload.diagnostic?.providerError) reasons.push("PROVIDER_HISTORY_PRESENT");
  if (!config.transactionalConsentGranted) reasons.push("TRANSACTIONAL_CONSENT_NOT_GRANTED");
  if (!invoice?.reference || invoice.reference !== config.expectedReference) reasons.push("REFERENCE_MISMATCH");
  if (
    !invoice?.recipient ||
    normalizeRecipient(invoice.recipient) !== normalizeRecipient(config.allowedRecipient)
  ) reasons.push("RECIPIENT_MISMATCH");
  if (config.confirmation !== INVOICE_SMOKE_TEST_CONFIRMATION) reasons.push("CONFIRMATION_REQUIRED");

  return {
    eligible: reasons.length === 0,
    reasons,
    reference: invoice?.reference,
    recipientLast4: normalizeRecipient(invoice?.recipient).slice(-4) || undefined,
    status: candidate.status,
  };
}
