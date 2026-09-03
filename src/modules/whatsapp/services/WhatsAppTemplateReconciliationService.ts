import type { PrismaClient, WhatsAppTemplateStatus } from "@prisma/client";
import { WhatsAppError } from "../errors.ts";
import type { MetaMessageTemplate, MetaWhatsAppClient } from "../clients/MetaWhatsAppClient.ts";
import { invoiceV1Definition, toMetaTemplateRequest } from "../templates/invoiceV1.ts";

type Db = Pick<PrismaClient, "whatsAppTemplateDefinition" | "whatsAppBusinessAccount" | "whatsAppTemplateInstance" | "$transaction">;

export class WhatsAppTemplateReconciliationService {
  constructor(private readonly db: Db, private readonly meta: MetaWhatsAppClient) {}

  async seedInvoiceV1() {
    return this.db.whatsAppTemplateDefinition.upsert({
      where: { id: invoiceV1Definition.id },
      create: invoiceV1Definition,
      update: invoiceV1Definition,
    });
  }

  async reconcileInvoiceV1(input: { organizationId: string; wabaIds?: string[] }) {
    const definition = await this.seedInvoiceV1();
    const wabas = await this.db.whatsAppBusinessAccount.findMany({
      where: {
        ...(input.wabaIds?.length ? { id: { in: input.wabaIds } } : {}),
        integration: { organizationId: input.organizationId, credentialRef: { not: null } },
      },
      select: { id: true, metaWabaId: true, integration: { select: { credentialRef: true } } },
    });
    if (input.wabaIds?.length && wabas.length !== new Set(input.wabaIds).size) throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "One or more WhatsApp accounts do not belong to this organization");
    if (!wabas.length) throw new WhatsAppError("WHATSAPP_NOT_CONNECTED", "No connected WhatsApp Business Account was found");

    const results = [];
    for (const waba of wabas) {
      const credentialRef = waba.integration.credentialRef!;
      const context = { organizationId: input.organizationId, credentialRef, metaWabaId: waba.metaWabaId };
      const templates = await this.meta.listMessageTemplates(context);
      let remote = templates.find(template => template.name === definition.name && template.language === definition.language);
      const created = !remote;
      if (!remote) remote = await this.meta.createMessageTemplate(toMetaTemplateRequest(context, invoiceV1Definition));
      await this.persistInstance(waba.id, definition.id, remote);
      results.push({ wabaId: waba.id, metaWabaId: waba.metaWabaId, created, status: remote.status });
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
