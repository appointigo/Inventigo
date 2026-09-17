import type { PrismaClient, WhatsAppTemplateStatus } from "@prisma/client";
import { isWhatsAppError, WhatsAppError } from "../errors.ts";
import type { MetaMessageTemplate, MetaWhatsAppClient } from "../clients/MetaWhatsAppClient.ts";
import { invoiceV1Definition, toMetaTemplateRequest } from "../templates/invoiceV1.ts";

type Db = Pick<PrismaClient, "whatsAppTemplateDefinition" | "whatsAppBusinessAccount" | "whatsAppTemplateInstance" | "$transaction">;
type TemplateComparison = "EXISTS" | "MISSING" | "PENDING" | "APPROVED" | "REJECTED";
type ReconcileInput = {
  organizationId: string;
  wabaIds?: string[];
  requestId?: string;
  report?: (stage: string, details?: Record<string, unknown>) => void;
};

function logReconciliation(
  stage: string,
  input: ReconcileInput,
  details: Record<string, unknown> = {}
) {
  input.report?.(stage, details);
  console.info(`[WhatsApp Templates] ${stage}`, {
    requestId: input.requestId,
    organizationId: input.organizationId,
    templateName: invoiceV1Definition.name,
    ...details,
  });
}

function compareTemplate(remote?: MetaMessageTemplate): TemplateComparison {
  if (!remote) return "MISSING";
  if (remote.status === "PENDING" || remote.status === "APPROVED" || remote.status === "REJECTED") return remote.status;
  return "EXISTS";
}

export class WhatsAppTemplateReconciliationService {
  constructor(private readonly db: Db, private readonly meta: MetaWhatsAppClient) {}

  async seedInvoiceV1() {
    return this.db.whatsAppTemplateDefinition.upsert({
      where: { id: invoiceV1Definition.id },
      create: invoiceV1Definition,
      update: invoiceV1Definition,
    });
  }

  async reconcileInvoiceV1(input: ReconcileInput) {
    const startedAt = Date.now();
    logReconciliation("reconcile_started", input);
    try {
      const result = await this.reconcileInvoiceV1Unchecked(input);
      logReconciliation("completed", input, {
        durationMs: Date.now() - startedAt,
        reconciled: result.length,
      });
      return result;
    } catch (error) {
      const details = isWhatsAppError(error) ? error.details : undefined;
      console.error("[WhatsApp Templates] reconcile_failed", {
        requestId: input.requestId,
        organizationId: input.organizationId,
        templateName: invoiceV1Definition.name,
        durationMs: Date.now() - startedAt,
        code: isWhatsAppError(error) ? error.code : "TEMPLATE_SYNC_FAILED",
        httpStatus: details?.httpStatus,
        providerCode: details?.providerCode,
        providerSubcode: details?.providerSubcode,
        providerType: details?.providerType,
        providerMessage: details?.providerMessage,
        contentType: details?.contentType,
        traceId: details?.traceId,
      });
      if (isWhatsAppError(error) && (error.code === "WHATSAPP_NOT_CONNECTED" || error.code === "TEMPLATE_SYNC_FAILED")) throw error;
      throw new WhatsAppError("TEMPLATE_SYNC_FAILED", "WhatsApp templates could not be synchronized", {
        retryable: isWhatsAppError(error) ? error.retryable : false,
        details: isWhatsAppError(error) ? {
          httpStatus: error.details?.httpStatus,
          providerCode: error.details?.providerCode,
          providerSubcode: error.details?.providerSubcode,
          providerType: error.details?.providerType,
          providerMessage: error.details?.providerMessage,
          contentType: error.details?.contentType,
          traceId: error.details?.traceId,
        } : undefined,
        cause: error,
      });
    }
  }

  private async reconcileInvoiceV1Unchecked(input: ReconcileInput) {
    const definition = await this.seedInvoiceV1();
    const wabas = await this.db.whatsAppBusinessAccount.findMany({
      where: {
        ...(input.wabaIds?.length ? { id: { in: input.wabaIds } } : {}),
        status: "ACTIVE",
        integration: { organizationId: input.organizationId, status: "CONNECTED", credentialRef: { not: null } },
      },
      select: { id: true, metaWabaId: true, integration: { select: { credentialRef: true } } },
    });
    logReconciliation("integration_loaded", input, { connectedWabaCount: wabas.length });
    if (input.wabaIds?.length && wabas.length !== new Set(input.wabaIds).size) throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "One or more WhatsApp accounts do not belong to this organization");
    if (!wabas.length) throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "No connected WhatsApp Business Account was found");

    const results = [];
    for (const waba of wabas) {
      logReconciliation("waba_resolved", input, { wabaId: waba.metaWabaId });
      const credentialRef = waba.integration.credentialRef!;
      const context = {
        organizationId: input.organizationId,
        credentialRef,
        metaWabaId: waba.metaWabaId,
        requestId: input.requestId,
        templateName: definition.name,
      };
      logReconciliation("meta_fetch_started", input, { wabaId: waba.metaWabaId });
      const templates = await this.meta.listMessageTemplates(context);
      logReconciliation("template_match_started", input, {
        wabaId: waba.metaWabaId,
        templateCount: templates.length,
      });
      let remote = templates.find(template => template.name === definition.name && template.language === definition.language);
      if (remote) {
        logReconciliation("template_found", input, {
          wabaId: waba.metaWabaId,
          metaTemplateId: remote.id,
          language: remote.language,
          category: remote.category,
          status: remote.status,
          matchedTemplateCount: 1,
        });
      }
      const comparison = compareTemplate(remote);
      const created = !remote;
      if (!remote) remote = await this.meta.createMessageTemplate(toMetaTemplateRequest(context, invoiceV1Definition));
      logReconciliation("db_update_started", input, {
        wabaId: waba.metaWabaId,
        metaTemplateId: remote.id,
        status: remote.status,
      });
      await this.persistInstance(waba.id, definition.id, remote);
      logReconciliation("db_update_completed", input, {
        wabaId: waba.metaWabaId,
        metaTemplateId: remote.id,
        status: remote.status,
      });
      results.push({ wabaId: waba.id, metaWabaId: waba.metaWabaId, comparison, created, status: remote.status });
    }
    return results;
  }

  private async persistInstance(wabaId: string, definitionId: string, remote: MetaMessageTemplate) {
    const now = new Date();
    const status = remote.status as WhatsAppTemplateStatus;
    const timestamps = {
      submittedAt: status === "PENDING" ? now : undefined,
      approvedAt: status === "APPROVED" ? now : null,
      rejectedAt: status === "REJECTED" ? now : null,
    };
    await this.db.whatsAppTemplateInstance.upsert({
      where: { wabaId_definitionId: { wabaId, definitionId } },
      create: { wabaId, definitionId, metaTemplateId: remote.id, metaTemplateName: remote.name, status, rejectionReason: remote.rejectionReason, lastSyncedAt: now, ...timestamps },
      update: { metaTemplateId: remote.id, metaTemplateName: remote.name, status, rejectionReason: remote.rejectionReason ?? null, lastSyncedAt: now, ...timestamps },
    });
  }
}
