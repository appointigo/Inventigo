import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { MetaWhatsAppClient } from "../clients/MetaWhatsAppClient";
import { normalizeWhatsAppPhone } from "./WhatsAppContactService.ts";
import { isWhatsAppError } from "../errors.ts";
import { resolveInvoiceTemplateVariables } from "./invoiceTemplateVariables.ts";
import { getDeploymentEnvironmentLabel } from "../invoiceDiagnostics.ts";

const ABANDONED_CLAIM_AFTER_MS = 15 * 60_000;

type InvoicePdfGenerator = (input: {
  correlationId?: string;
  messageId?: string;
  organizationId: string;
  storeId: string;
  kind: "SALE" | "EXCHANGE";
  transactionId: string;
}) => Promise<{ buffer: Buffer; filename: string; reference: string }>;

export type WhatsAppInvoiceSelection = {
  enabled: boolean;
  recipient?: string;
  templateInstanceId?: string;
  consentConfirmed?: boolean;
};

export type PreparedInvoiceDelivery = {
  correlationId: string;
  deploymentEnvironment: string;
  organizationId: string;
  storeId: string;
  recipient: string;
  phoneNumberId: string;
  templateInstanceId: string;
  metaTemplateName: string;
  templateKey: string;
  templateVersion: number;
  language: string;
  variableCount: number;
  variableKeys: string[];
  storeName: string;
};

type InvoicePayload = {
  invoiceDelivery: {
    correlationId: string;
    deploymentEnvironment?: string;
    kind: "SALE" | "EXCHANGE";
    transactionId: string;
    recipient: string;
    filename?: string;
    customerName: string;
    reference: string;
    storeName: string;
    amount: number;
    variableCount: number;
    variableKeys: string[];
    transactionDate: string;
    resend: boolean;
  };
};

const asPayload = (value: unknown): InvoicePayload | null => {
  if (!value || typeof value !== "object" || !("invoiceDelivery" in value)) return null;
  return value as InvoicePayload;
};

export async function prepareInvoiceDelivery(
  prisma: PrismaClient,
  input: { organizationId: string; storeId: string; selection?: WhatsAppInvoiceSelection; correlationId?: string }
): Promise<PreparedInvoiceDelivery | null> {
  if (!input.selection?.enabled) return null;
  if (!input.selection.consentConfirmed) throw new Error("WHATSAPP_INVOICE_CONSENT_REQUIRED");
  if (!input.selection.recipient?.trim()) throw new Error("WHATSAPP_INVOICE_RECIPIENT_REQUIRED");
  if (!input.selection.templateInstanceId) throw new Error("WHATSAPP_INVOICE_TEMPLATE_REQUIRED");
  const recipient = normalizeWhatsAppPhone(input.selection.recipient).replace(/^\+/, "");
  const { WhatsAppInvoiceTemplateService } = await import("./WhatsAppInvoiceTemplateService.ts");
  const eligibility = await new WhatsAppInvoiceTemplateService(prisma).assertEligible(
    input.organizationId,
    input.storeId,
    input.selection.templateInstanceId,
    input.correlationId
  );
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, orgId: input.organizationId },
    select: { name: true },
  });
  if (!store) throw new Error("STORE_NOT_FOUND");
  return {
    correlationId: input.correlationId ?? crypto.randomUUID(),
    deploymentEnvironment: getDeploymentEnvironmentLabel(),
    organizationId: input.organizationId,
    storeId: input.storeId,
    recipient,
    phoneNumberId: eligibility.sender.phoneNumberId,
    templateInstanceId: eligibility.template.id,
    metaTemplateName: eligibility.template.name,
    templateKey: eligibility.template.key,
    templateVersion: eligibility.template.version,
    language: eligibility.template.language,
    variableCount: eligibility.template.variableCount,
    variableKeys: eligibility.template.variableKeys,
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
    transactionDate: Date;
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
  const message = await tx.whatsAppMessage.upsert({
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
          correlationId: prepared.correlationId,
          deploymentEnvironment: prepared.deploymentEnvironment,
          kind: transaction.kind,
          transactionId: transaction.id,
          recipient: prepared.recipient,
          customerName: transaction.customerName?.trim() || "Customer",
          reference: transaction.reference,
          storeName: prepared.storeName,
          amount: transaction.amount,
          variableCount: prepared.variableCount,
          variableKeys: prepared.variableKeys,
          transactionDate: transaction.transactionDate.toISOString(),
          resend,
        },
      },
      status: "QUEUED",
      queuedAt: new Date(),
    },
    update: {},
    select: { id: true, status: true, errorCode: true, errorMessage: true },
  });
  console.info("[WhatsApp Invoice] delivery_queued", {
    requestId: prepared.correlationId,
    deliveryId: message.id,
    deploymentEnvironment: prepared.deploymentEnvironment,
    organizationId: prepared.organizationId,
    storeId: prepared.storeId,
    transactionId: transaction.id,
    transactionType: transaction.kind,
    status: message.status,
    resend,
  });
  return message;
}

export class WhatsAppInvoiceDeliveryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly meta: MetaWhatsAppClient,
    private readonly invoicePdfGenerator?: InvoicePdfGenerator
  ) {}

  private async generatePdf(input: Parameters<InvoicePdfGenerator>[0]) {
    if (this.invoicePdfGenerator) return this.invoicePdfGenerator(input);
    const { generateInvoicePdf } = await import("@/modules/billing/services/invoicePdfService");
    return generateInvoicePdf(input);
  }

  async processMessage(messageId: string) {
    const processingStartedAt = Date.now();
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
    const correlationId = payload?.invoiceDelivery.correlationId ?? message.id;
    const deploymentEnvironment = getDeploymentEnvironmentLabel();
    console.info("[WhatsApp Invoice] delivery_loaded", {
      requestId: correlationId,
      deliveryId: message.id,
      deploymentEnvironment,
      queuedEnvironment: payload?.invoiceDelivery.deploymentEnvironment,
      organizationId: message.organizationId,
      storeId: message.storeId,
      transactionId: payload?.invoiceDelivery.transactionId,
      transactionType: payload?.invoiceDelivery.kind,
      reference: payload?.invoiceDelivery.reference,
      status: message.status,
      templateInstanceId: message.templateInstance?.id,
      templateName: message.templateInstance?.metaTemplateName,
      templateLanguage: message.templateInstance?.definition.language,
      phoneNumberId: message.phoneNumberId,
      wabaId: message.phoneNumber.wabaId,
      elapsedMs: Date.now() - processingStartedAt,
    });
    const claimed = await this.prisma.whatsAppMessage.updateMany({
      where: { id: message.id, status: "QUEUED", metaMessageId: null, dispatchClaimedAt: null },
      data: { dispatchClaimedAt: new Date(), errorCode: null, errorMessage: null },
    });
    if (!claimed.count) return message;
    const attemptCount = await this.prisma.whatsAppMessage.count({
      where: {
        organizationId: message.organizationId,
        purpose: "INVOICE",
        referenceType: message.referenceType,
        referenceId: message.referenceId,
        createdAt: { lte: message.createdAt },
      },
    });
    console.info("[WhatsApp Invoice] delivery_claimed", {
      requestId: correlationId,
      deliveryId: message.id,
      deploymentEnvironment,
      stage: "CLAIMED",
      attemptCount,
      status: "QUEUED",
      elapsedMs: Date.now() - processingStartedAt,
    });
    let providerSubmissionStarted = false;
    let currentOperation = "VALIDATE_DELIVERY";
    let persistedPayload: Record<string, unknown> = message.payload && typeof message.payload === "object" && !Array.isArray(message.payload)
      ? { ...(message.payload as Record<string, unknown>) }
      : {};
    try {
      if (!payload || !message.templateInstance || !message.storeId) {
        throw new Error("INVOICE_DELIVERY_INVALID");
      }
      const integration = message.phoneNumber.waba.integration;
      if (integration.organizationId !== message.organizationId || integration.status !== "CONNECTED" || !integration.credentialRef) {
        throw new Error("WHATSAPP_NOT_CONNECTED");
      }
      if (message.phoneNumber.wabaId !== message.templateInstance.wabaId || message.templateInstance.status !== "APPROVED") {
        throw new Error("INVOICE_TEMPLATE_NOT_ELIGIBLE");
      }
      const invoice = payload.invoiceDelivery;
      currentOperation = "PDF_GENERATION";
      const pdf = await this.generatePdf({
        correlationId,
        messageId: message.id,
        organizationId: message.organizationId,
        storeId: message.storeId,
        kind: invoice.kind,
        transactionId: invoice.transactionId,
      });
      currentOperation = "UPLOAD_MEDIA";
      console.info("[WhatsApp Invoice] media_upload_started", {
        requestId: correlationId,
        deliveryId: message.id,
        deploymentEnvironment,
        stage: currentOperation,
        attemptCount,
        filename: pdf.filename,
        byteLength: pdf.buffer.byteLength,
      });
      const media = await this.meta.uploadMedia({
        requestId: correlationId,
        organizationId: message.organizationId,
        credentialRef: integration.credentialRef,
        metaPhoneNumberId: message.phoneNumber.metaPhoneNumberId,
        data: pdf.buffer,
        mimeType: "application/pdf",
        filename: pdf.filename,
      });
      console.info("[WhatsApp Invoice] media_upload_completed", {
        requestId: correlationId,
        deliveryId: message.id,
        deploymentEnvironment,
        stage: currentOperation,
        attemptCount,
        mediaIdPresent: Boolean(media.mediaId),
        elapsedMs: Date.now() - processingStartedAt,
      });
      const variableKeys = invoice.variableKeys ?? Array.from({ length: invoice.variableCount }, (_, index) => String(index + 1));
      const variables = resolveInvoiceTemplateVariables(variableKeys, invoice);
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
      persistedPayload = {
        ...persistedPayload,
        outboundContent: content,
        diagnostic: {
          correlationId,
          queuedEnvironment: payload.invoiceDelivery.deploymentEnvironment,
          processingEnvironment: deploymentEnvironment,
          attemptCount,
          invoiceFilename: pdf.filename,
          pdfByteLength: pdf.buffer.byteLength,
          pdfSignatureValid: pdf.buffer.subarray(0, 5).toString("ascii") === "%PDF-",
          mediaIdPresent: Boolean(media.mediaId),
          templateName: message.templateInstance.metaTemplateName,
          templateLanguage: message.templateInstance.definition.language,
        },
      };
      await this.prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { payload: JSON.parse(JSON.stringify(persistedPayload)) },
      });
      currentOperation = "SEND_TEMPLATE_MESSAGE";
      providerSubmissionStarted = true;
      console.info("[WhatsApp Invoice] message_submission_started", {
        requestId: correlationId,
        deliveryId: message.id,
        deploymentEnvironment,
        stage: currentOperation,
        attemptCount,
      });
      const result = await this.meta.sendMessage({
        requestId: correlationId,
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
      console.info("[WhatsApp Invoice] delivery_submitted", {
        requestId: correlationId,
        deliveryId: message.id,
        deploymentEnvironment,
        organizationId: message.organizationId,
        storeId: message.storeId,
        metaMessageId: result.providerMessageId,
        transactionId: invoice.transactionId,
        providerMessageIdPresent: Boolean(result.providerMessageId),
        httpStatus: result.httpStatus,
        status: "SUBMITTED",
        stage: "SUBMITTED",
        attemptCount,
        elapsedMs: Date.now() - processingStartedAt,
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
        : isWhatsAppError(error) && typeof error.details?.providerMessage === "string"
          ? error.details.providerMessage.slice(0, 500)
          : error instanceof Error
            ? error.message.slice(0, 500)
          : "Invoice delivery failed";
      const providerError = isWhatsAppError(error) ? {
        code: error.code,
        retryable: error.retryable,
        httpStatus: error.details?.httpStatus,
        providerCode: error.details?.providerCode,
        providerSubcode: error.details?.providerSubcode,
        providerType: error.details?.providerType,
        providerMessage: error.details?.providerMessage,
        providerUserTitle: error.details?.providerUserTitle,
        providerUserMessage: error.details?.providerUserMessage,
        traceId: error.details?.traceId,
        operation: currentOperation,
      } : { code };
      console.warn("[WhatsApp Invoice] delivery_failed", {
        requestId: correlationId,
        deliveryId: message.id,
        deploymentEnvironment,
        organizationId: message.organizationId,
        storeId: message.storeId,
        transactionId: payload?.invoiceDelivery.transactionId,
        status: "FAILED",
        stage: currentOperation,
        attemptCount,
        providerSubmissionStarted,
        ...providerError,
        elapsedMs: Date.now() - processingStartedAt,
      });
      await this.prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          status: "FAILED",
          errorCode: code,
          errorMessage,
          failedAt: new Date(),
          dispatchClaimedAt: null,
          payload: JSON.parse(JSON.stringify({
            ...persistedPayload,
            diagnostic: {
              ...(persistedPayload.diagnostic && typeof persistedPayload.diagnostic === "object" ? persistedPayload.diagnostic : {}),
              correlationId,
              queuedEnvironment: payload?.invoiceDelivery.deploymentEnvironment,
              processingEnvironment: deploymentEnvironment,
              attemptCount,
              providerError,
            },
          })),
        },
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
    if (recovered.count) {
      console.warn("[WhatsApp Invoice] abandoned_claims_recovered", {
        deploymentEnvironment: getDeploymentEnvironmentLabel(),
        stage: "RECOVER_ABANDONED_CLAIMS",
        recovered: recovered.count,
      });
    }
    return recovered.count;
  }

  async processBatch(limit = 10) {
    const deploymentEnvironment = getDeploymentEnvironmentLabel();
    console.info("[WhatsApp Invoice] batch_started", { deploymentEnvironment, stage: "BATCH_DISCOVERY", limit });
    const abandoned = await this.recoverAbandonedClaims();
    const queued = await this.prisma.whatsAppMessage.findMany({
      where: { purpose: "INVOICE", status: "QUEUED", metaMessageId: null, dispatchClaimedAt: null },
      orderBy: { queuedAt: "asc" },
      take: limit,
      select: { id: true, queuedAt: true },
    });
    console.info("[WhatsApp Invoice] batch_discovered", {
      deploymentEnvironment,
      stage: "BATCH_DISCOVERY",
      queued: queued.length,
      oldestQueuedAt: queued[0]?.queuedAt?.toISOString(),
      abandoned,
    });
    const results = await Promise.allSettled(queued.map(item => this.processMessage(item.id)));
    const submitted = results.filter(item => item.status === "fulfilled" && ["SUBMITTED", "SENT", "DELIVERED", "READ"].includes(item.value.status)).length;
    const skipped = results.filter(item => item.status === "fulfilled").length - submitted;
    const summary = { abandoned, attempted: results.length, submitted, skipped, failed: results.filter(item => item.status === "rejected").length };
    console.info("[WhatsApp Invoice] batch_completed", { deploymentEnvironment, stage: "BATCH_COMPLETE", ...summary });
    return summary;
  }
}
