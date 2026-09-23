import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { MetaWhatsAppClient } from "../clients/MetaWhatsAppClient";
import { normalizeWhatsAppPhone } from "./WhatsAppContactService";
import { WhatsAppInvoiceTemplateService } from "./WhatsAppInvoiceTemplateService";
import { generateInvoicePdf } from "@/modules/billing/services/invoicePdfService";
import { isWhatsAppError } from "../errors";

const ABANDONED_CLAIM_AFTER_MS = 15 * 60_000;

export type WhatsAppInvoiceSelection = {
  enabled: boolean;
  recipient?: string;
  templateInstanceId?: string;
  consentConfirmed?: boolean;
};

export type PreparedInvoiceDelivery = {
  organizationId: string;
  storeId: string;
  recipient: string;
  phoneNumberId: string;
  templateInstanceId: string;
  templateKey: string;
  templateVersion: number;
  language: string;
  variableCount: number;
  storeName: string;
};

type InvoicePayload = {
  invoiceDelivery: {
    kind: "SALE" | "EXCHANGE";
    transactionId: string;
    recipient: string;
    filename?: string;
    customerName: string;
    reference: string;
    storeName: string;
    amount: number;
    variableCount: number;
    resend: boolean;
  };
};

const asPayload = (value: unknown): InvoicePayload | null => {
  if (!value || typeof value !== "object" || !("invoiceDelivery" in value)) return null;
  return value as InvoicePayload;
};

export async function prepareInvoiceDelivery(
  prisma: PrismaClient,
  input: { organizationId: string; storeId: string; selection?: WhatsAppInvoiceSelection }
): Promise<PreparedInvoiceDelivery | null> {
  if (!input.selection?.enabled) return null;
  if (!input.selection.consentConfirmed) throw new Error("WHATSAPP_INVOICE_CONSENT_REQUIRED");
  if (!input.selection.recipient?.trim()) throw new Error("WHATSAPP_INVOICE_RECIPIENT_REQUIRED");
  if (!input.selection.templateInstanceId) throw new Error("WHATSAPP_INVOICE_TEMPLATE_REQUIRED");
  const recipient = normalizeWhatsAppPhone(input.selection.recipient).replace(/^\+/, "");
  const eligibility = await new WhatsAppInvoiceTemplateService(prisma).assertEligible(
    input.organizationId,
    input.storeId,
    input.selection.templateInstanceId
  );
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, orgId: input.organizationId },
    select: { name: true },
  });
  if (!store) throw new Error("STORE_NOT_FOUND");
  return {
    organizationId: input.organizationId,
    storeId: input.storeId,
    recipient,
    phoneNumberId: eligibility.sender.phoneNumberId,
    templateInstanceId: eligibility.template.id,
    templateKey: eligibility.template.key,
    templateVersion: eligibility.template.version,
    language: eligibility.template.language,
    variableCount: eligibility.template.variableCount,
    storeName: store.name,
  };
}

export async function enqueueInvoiceDelivery(
  tx: Prisma.TransactionClient,
  prepared: PreparedInvoiceDelivery,
  transaction: {
    kind: "SALE" | "EXCHANGE";
    id: string;
    reference: string;
    customerName?: string | null;
    customerId?: string | null;
    amount: number;
    resend?: boolean;
  }
) {
  const resend = transaction.resend === true;
  const idempotencyKey = resend
    ? `invoice:${transaction.kind}:${transaction.id}:resend:${crypto.randomUUID()}`
    : `invoice:${transaction.kind}:${transaction.id}:initial`;
  if (transaction.customerId) {
    const contact = await tx.whatsAppContact.findFirst({
      where: { organizationId: prepared.organizationId, customerId: transaction.customerId },
      select: { id: true },
    });
    if (contact) {
      const now = new Date();
      await tx.whatsAppConsent.upsert({
        where: { contactId_purpose: { contactId: contact.id, purpose: "TRANSACTIONAL" } },
        create: { contactId: contact.id, purpose: "TRANSACTIONAL", status: "GRANTED", source: "BILLING_INVOICE", evidence: { reference: transaction.reference, channel: "WHATSAPP" }, recordedAt: now, grantedAt: now },
        update: { status: "GRANTED", source: "BILLING_INVOICE", evidence: { reference: transaction.reference, channel: "WHATSAPP" }, recordedAt: now, grantedAt: now, revokedAt: null },
      });
    }
  }
  return tx.whatsAppMessage.upsert({
    where: { idempotencyKey },
    create: {
      organizationId: prepared.organizationId,
      storeId: prepared.storeId,
      phoneNumberId: prepared.phoneNumberId,
      templateInstanceId: prepared.templateInstanceId,
      idempotencyKey,
      direction: "OUTBOUND",
      type: "TEMPLATE",
      purpose: "INVOICE",
      toPhone: prepared.recipient,
      referenceType: transaction.kind === "SALE" ? "SALE" : "RETURN_TRANSACTION",
      referenceId: transaction.id,
      payload: {
        invoiceDelivery: {
          kind: transaction.kind,
          transactionId: transaction.id,
          recipient: prepared.recipient,
          customerName: transaction.customerName?.trim() || "Customer",
          reference: transaction.reference,
          storeName: prepared.storeName,
          amount: transaction.amount,
          variableCount: prepared.variableCount,
          resend,
        },
      },
      status: "QUEUED",
      queuedAt: new Date(),
    },
    update: {},
    select: { id: true, status: true, errorCode: true, errorMessage: true },
  });
}

export class WhatsAppInvoiceDeliveryService {
  constructor(private readonly prisma: PrismaClient, private readonly meta: MetaWhatsAppClient) {}

  async processMessage(messageId: string) {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { id: messageId, purpose: "INVOICE", direction: "OUTBOUND" },
      include: {
        phoneNumber: { include: { waba: { include: { integration: true } } } },
        templateInstance: { include: { definition: true } },
      },
    });
    if (!message) throw new Error("INVOICE_DELIVERY_NOT_FOUND");
    if (["SUBMITTED", "SENT", "DELIVERED", "READ"].includes(message.status)) return message;
    const payload = asPayload(message.payload);
    if (!payload || !message.templateInstance) throw new Error("INVOICE_DELIVERY_INVALID");
    const integration = message.phoneNumber.waba.integration;
    if (integration.organizationId !== message.organizationId || integration.status !== "CONNECTED" || !integration.credentialRef)
      throw new Error("WHATSAPP_NOT_CONNECTED");
    if (message.phoneNumber.wabaId !== message.templateInstance.wabaId || message.templateInstance.status !== "APPROVED")
      throw new Error("INVOICE_TEMPLATE_NOT_ELIGIBLE");

    const claimed = await this.prisma.whatsAppMessage.updateMany({
      where: { id: message.id, status: "QUEUED", metaMessageId: null, dispatchClaimedAt: null },
      data: { dispatchClaimedAt: new Date(), errorCode: null, errorMessage: null },
    });
    if (!claimed.count) return message;
    let providerSubmissionStarted = false;
    try {
      const invoice = payload.invoiceDelivery;
      const pdf = await generateInvoicePdf({
        organizationId: message.organizationId,
        storeId: message.storeId!,
        kind: invoice.kind,
        transactionId: invoice.transactionId,
      });
      const media = await this.meta.uploadMedia({
        organizationId: message.organizationId,
        credentialRef: integration.credentialRef,
        metaPhoneNumberId: message.phoneNumber.metaPhoneNumberId,
        data: pdf.buffer,
        mimeType: "application/pdf",
        filename: pdf.filename,
      });
      const standardValues = [
        invoice.customerName,
        invoice.reference,
        invoice.storeName,
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(invoice.amount),
      ];
      if (invoice.variableCount > standardValues.length)
        throw new Error("INVOICE_TEMPLATE_VARIABLES_UNSUPPORTED");
      const variables = Object.fromEntries(
        standardValues.slice(0, invoice.variableCount).map((value, index) => [String(index + 1), value])
      );
      const content = {
        type: "TEMPLATE" as const,
        template: {
          instanceId: message.templateInstance.id,
          key: message.templateInstance.definition.key,
          language: message.templateInstance.definition.language,
          version: message.templateInstance.definition.version,
          variables,
          headerDocument: { id: media.mediaId, filename: pdf.filename },
        },
      };
      await this.prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { payload: JSON.parse(JSON.stringify(content)) },
      });
      providerSubmissionStarted = true;
      const result = await this.meta.sendMessage({
        organizationId: message.organizationId,
        credentialRef: integration.credentialRef,
        metaPhoneNumberId: message.phoneNumber.metaPhoneNumberId,
        recipient: invoice.recipient,
        content,
        template: {
          metaTemplateName: message.templateInstance.metaTemplateName,
          language: message.templateInstance.definition.language,
        },
      });
      return this.prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { metaMessageId: result.providerMessageId, status: "SUBMITTED", submittedAt: result.acceptedAt },
      });
    } catch (error) {
      const providerOutcomeUnknown = providerSubmissionStarted && (
        (isWhatsAppError(error) && (
          error.code === "META_TIMEOUT" ||
          error.code === "META_INVALID_RESPONSE" ||
          (error.code === "META_PROVIDER_FAILED" && !error.details?.httpStatus)
        )) ||
        !(error instanceof Error)
      );
      const code = providerOutcomeUnknown
        ? "INVOICE_PROVIDER_OUTCOME_UNKNOWN"
        : isWhatsAppError(error)
          ? error.code
          : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "INVOICE_DELIVERY_FAILED";
      const errorMessage = providerOutcomeUnknown
        ? "Meta submission may have succeeded, but no provider message id was received. Review before creating a manual resend."
        : error instanceof Error
          ? error.message.slice(0, 500)
          : "Invoice delivery failed";
      await this.prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: "FAILED", errorCode: code, errorMessage, failedAt: new Date(), dispatchClaimedAt: null },
      });
      throw error;
    }
  }

  private async recoverAbandonedClaims() {
    const cutoff = new Date(Date.now() - ABANDONED_CLAIM_AFTER_MS);
    const recovered = await this.prisma.whatsAppMessage.updateMany({
      where: {
        purpose: "INVOICE",
        status: "QUEUED",
        metaMessageId: null,
        dispatchClaimedAt: { lt: cutoff },
      },
      data: {
        status: "FAILED",
        errorCode: "INVOICE_PROVIDER_OUTCOME_UNKNOWN",
        errorMessage: "Invoice processing stopped before its Meta outcome was persisted. Review before creating a manual resend.",
        failedAt: new Date(),
        dispatchClaimedAt: null,
      },
    });
    return recovered.count;
  }

  async processBatch(limit = 10) {
    const abandoned = await this.recoverAbandonedClaims();
    const queued = await this.prisma.whatsAppMessage.findMany({
      where: { purpose: "INVOICE", status: "QUEUED", metaMessageId: null, dispatchClaimedAt: null },
      orderBy: { queuedAt: "asc" },
      take: limit,
      select: { id: true },
    });
    const results = await Promise.allSettled(queued.map(item => this.processMessage(item.id)));
    return { abandoned, attempted: results.length, submitted: results.filter(item => item.status === "fulfilled").length, failed: results.filter(item => item.status === "rejected").length };
  }
}
