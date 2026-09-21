import type { Prisma, PrismaClient, WhatsAppTemplateCategory, WhatsAppTemplateStatus } from "@prisma/client";
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

  async reconcileAll(input: ReconcileInput) {
    const startedAt = Date.now();
    logReconciliation("reconcile_started", input, { mode: "all" });
    try {
      const result = await this.reconcileAllUnchecked(input);
      logReconciliation("completed", input, {
        durationMs: Date.now() - startedAt,
        reconciled: result.length,
        mode: "all",
      });
      return result;
    } catch (error) {
      const details = isWhatsAppError(error) ? error.details : undefined;
      console.error("[WhatsApp Templates] reconcile_failed", {
        requestId: input.requestId,
        organizationId: input.organizationId,
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
      if (
        isWhatsAppError(error) &&
        (error.code === "WHATSAPP_NOT_CONNECTED" || error.code === "TEMPLATE_SYNC_FAILED")
      ) throw error;
      throw new WhatsAppError(
        "TEMPLATE_SYNC_FAILED",
        "WhatsApp templates could not be synchronized",
        {
          retryable: isWhatsAppError(error) ? error.retryable : false,
          details: isWhatsAppError(error) ? error.details : undefined,
          cause: error,
        }
      );
    }
  }

  private async reconcileAllUnchecked(input: ReconcileInput) {
    const invoiceDefinition = await this.seedInvoiceV1();
    const wabas = await this.db.whatsAppBusinessAccount.findMany({
      where: {
        ...(input.wabaIds?.length ? { id: { in: input.wabaIds } } : {}),
        status: "ACTIVE",
        integration: {
          organizationId: input.organizationId,
          status: "CONNECTED",
          credentialRef: { not: null },
        },
      },
      select: {
        id: true,
        metaWabaId: true,
        integration: { select: { credentialRef: true } },
      },
    });
    logReconciliation("integration_loaded", input, { connectedWabaCount: wabas.length });
    if (input.wabaIds?.length && wabas.length !== new Set(input.wabaIds).size)
      throw new WhatsAppError(
        "WHATSAPP_NOT_CONNECTED",
        "One or more WhatsApp accounts do not belong to this organization"
      );
    if (!wabas.length)
      throw new WhatsAppError(
        "WHATSAPP_NOT_CONNECTED",
        "No connected WhatsApp Business Account was found"
      );

    const results: Array<Record<string, unknown>> = [];
    for (const waba of wabas) {
      logReconciliation("waba_resolved", input, { wabaId: waba.metaWabaId });
      const context = {
        organizationId: input.organizationId,
        credentialRef: waba.integration.credentialRef!,
        metaWabaId: waba.metaWabaId,
        requestId: input.requestId,
      };
      logReconciliation("meta_fetch_started", input, { wabaId: waba.metaWabaId });
      const remoteTemplates = await this.meta.listMessageTemplates(context);
      const localInstances = await this.db.whatsAppTemplateInstance.findMany({
        where: {
          wabaId: waba.id,
          definition: {
            OR: [
              { scope: "PLATFORM", organizationId: null },
              { scope: "ORGANIZATION", organizationId: input.organizationId },
            ],
          },
        },
        select: {
          id: true,
          metaTemplateId: true,
          metaTemplateName: true,
          definitionId: true,
          definition: {
            select: { id: true, name: true, language: true, category: true },
          },
        },
      });
      logReconciliation("template_match_started", input, {
        wabaId: waba.metaWabaId,
        templateCount: remoteTemplates.length,
        localTemplateCount: localInstances.length,
      });

      let invoiceRemote = remoteTemplates.find(
        template =>
          template.name === invoiceDefinition.name &&
          template.language === invoiceDefinition.language
      );
      const invoiceCreated = !invoiceRemote;
      if (!invoiceRemote) {
        invoiceRemote = await this.meta.createMessageTemplate(
          toMetaTemplateRequest(context, invoiceV1Definition)
        );
      }
      await this.persistInstance(waba.id, invoiceDefinition.id, invoiceRemote);
      const matchedRemoteIds = new Set([invoiceRemote.id]);
      results.push({
        wabaId: waba.id,
        metaWabaId: waba.metaWabaId,
        definitionId: invoiceDefinition.id,
        created: invoiceCreated,
        status: invoiceRemote.status,
      });

      for (const local of localInstances) {
        if (local.definitionId === invoiceDefinition.id) continue;
        const remote = remoteTemplates.find(template =>
          local.metaTemplateId
            ? template.id === local.metaTemplateId
            : template.name === local.metaTemplateName &&
              template.language === local.definition.language
        );
        if (!remote) continue;
        matchedRemoteIds.add(remote.id);
        await this.updateExistingInstance(local.id, local.definition.id, remote);
        results.push({
          wabaId: waba.id,
          metaWabaId: waba.metaWabaId,
          definitionId: local.definitionId,
          created: false,
          status: remote.status,
        });
      }
      for (const remote of remoteTemplates) {
        if (matchedRemoteIds.has(remote.id)) continue;
        const imported = await this.importRemoteTemplate(
          input.organizationId,
          waba.id,
          remote
        );
        results.push({
          wabaId: waba.id,
          metaWabaId: waba.metaWabaId,
          definitionId: imported.definitionId,
          created: false,
          imported: true,
          status: remote.status,
        });
      }
    }
    return results;
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

  private async updateExistingInstance(
    instanceId: string,
    definitionId: string,
    remote: MetaMessageTemplate
  ) {
    const now = new Date();
    const status = remote.status as WhatsAppTemplateStatus;
    await this.db.$transaction([
      this.db.whatsAppTemplateInstance.update({
        where: { id: instanceId },
        data: {
          metaTemplateId: remote.id,
          metaTemplateName: remote.name,
          status,
          rejectionReason: remote.rejectionReason ?? null,
          lastSyncedAt: now,
          submittedAt: status === "PENDING" ? now : undefined,
          approvedAt: status === "APPROVED" ? now : null,
          rejectedAt: status === "REJECTED" ? now : null,
        },
      }),
      ...(remote.category === "UTILITY" || remote.category === "MARKETING" || remote.category === "AUTHENTICATION"
        ? [this.db.whatsAppTemplateDefinition.update({
            where: { id: definitionId },
            data: { category: remote.category },
          })]
        : []),
    ]);
  }

  private async importRemoteTemplate(
    organizationId: string,
    wabaId: string,
    remote: MetaMessageTemplate
  ) {
    const now = new Date();
    const status = remote.status as WhatsAppTemplateStatus;
    const category = normalizeCategory(remote.category);
    const components = remote.components ?? [];
    const bodyComponent = findComponent(components, "BODY");
    const footerComponent = findComponent(components, "FOOTER");
    const headerComponent = findComponent(components, "HEADER");
    const buttonsComponent = findComponent(components, "BUTTONS");
    return this.db.$transaction(async tx => {
      const definition = await tx.whatsAppTemplateDefinition.create({
        data: {
          organizationId,
          scope: "ORGANIZATION",
          source: "META_IMPORTED",
          key: `meta_import_${remote.id}`,
          version: 1,
          language: remote.language,
          purpose: "CUSTOM",
          category,
          name: remote.name,
          displayLabel: remote.name.replaceAll("_", " "),
          header: headerComponent as Prisma.InputJsonValue | undefined,
          body: componentText(bodyComponent) ?? "",
          footer: componentText(footerComponent),
          buttons: buttonsComponent as Prisma.InputJsonValue | undefined,
          variables: [],
        },
        select: { id: true },
      });
      const instance = await tx.whatsAppTemplateInstance.create({
        data: {
          definitionId: definition.id,
          wabaId,
          metaTemplateId: remote.id,
          metaTemplateName: remote.name,
          status,
          rejectionReason: remote.rejectionReason ?? null,
          submittedAt: now,
          approvedAt: status === "APPROVED" ? now : null,
          rejectedAt: status === "REJECTED" ? now : null,
          lastSyncedAt: now,
        },
        select: { id: true },
      });
      return { definitionId: definition.id, instanceId: instance.id };
    });
  }
}

function normalizeCategory(category: string): WhatsAppTemplateCategory {
  return category === "UTILITY" || category === "AUTHENTICATION"
    ? category
    : "MARKETING";
}

function findComponent(components: unknown[], type: string): Record<string, unknown> | undefined {
  return components.find(
    (component): component is Record<string, unknown> =>
      Boolean(component) &&
      typeof component === "object" &&
      (component as Record<string, unknown>).type === type
  );
}

function componentText(component?: Record<string, unknown>): string | undefined {
  return typeof component?.text === "string" ? component.text : undefined;
}
