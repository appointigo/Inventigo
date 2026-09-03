import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient, WhatsAppAutomationTrigger } from "@prisma/client";
import type { z } from "zod";
import type { CommunicationRequest, CommunicationResult } from "../../communication/types.ts";
import type { automationSchema } from "../automationSchemas.ts";
import { isWhatsAppError } from "../errors.ts";
type Input = z.infer<typeof automationSchema>;
type Sender = { send(r: CommunicationRequest): Promise<CommunicationResult> };
type Event = {
  organizationId: string;
  storeId: string;
  trigger: WhatsAppAutomationTrigger;
  subjectType: string;
  subjectId: string;
  customerId?: string;
  phone?: string;
  amount?: number;
  occurredAt: Date;
  payload?: Record<string, unknown>;
};
export class WhatsAppAutomationService {
  constructor(
    private db: PrismaClient,
    private communication?: Sender
  ) {}
  list(org: string) {
    return this.db.whatsAppAutomation.findMany({
      where: { organizationId: org },
      include: {
        store: { select: { name: true } },
        templateDefinition: { select: { name: true, language: true } },
        executions: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            messages: { take: 1, orderBy: { createdAt: "desc" }, select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async options(org: string) {
    return {
      stores: await this.db.store.findMany({
        where: { orgId: org, isActive: true },
        select: { id: true, name: true, code: true },
      }),
      templates: await this.db.whatsAppTemplateDefinition.findMany({
        where: {
          isActive: true,
          instances: {
            some: { status: "APPROVED", waba: { integration: { organizationId: org } } },
          },
          OR: [
            { scope: "PLATFORM", organizationId: null },
            { scope: "ORGANIZATION", organizationId: org },
          ],
        },
        select: { id: true, name: true, language: true, category: true, purpose: true },
      }),
    };
  }
  async save(org: string, id: string | undefined, input: Input) {
    if (
      input.storeId &&
      !(await this.db.store.findFirst({ where: { id: input.storeId, orgId: org } }))
    )
      throw new Error("Store not found");
    const tpl = await this.db.whatsAppTemplateDefinition.findFirst({
      where: {
        id: input.templateDefinitionId,
        isActive: true,
        category: input.trigger === "CUSTOMER_INACTIVE" ? "MARKETING" : "UTILITY",
        OR: [
          { scope: "PLATFORM", organizationId: null },
          { scope: "ORGANIZATION", organizationId: org },
        ],
      },
    });
    if (!tpl) throw new Error("Template not found");
    const data = {
      ...input,
      storeId: input.storeId ?? null,
      conditions: input.conditions as Prisma.InputJsonValue,
    };
    return id
      ? this.db.whatsAppAutomation.update({ where: { id, organizationId: org }, data })
      : this.db.whatsAppAutomation.create({ data: { organizationId: org, ...data } });
  }
  async remove(org: string, id: string) {
    const r = await this.db.whatsAppAutomation.deleteMany({ where: { id, organizationId: org } });
    if (!r.count) throw new Error("Automation not found");
  }
  async emit(event: Event) {
    const rules = await this.db.whatsAppAutomation.findMany({
      where: {
        organizationId: event.organizationId,
        trigger: event.trigger,
        isActive: true,
        OR: [{ storeId: null }, { storeId: event.storeId }],
      },
    });
    for (const rule of rules) {
      const c = (rule.conditions ?? {}) as { minAmount?: number };
      let reason: string | undefined;
      if (c.minAmount !== undefined && (event.amount ?? 0) < c.minAmount)
        reason = "CONDITION_NOT_MATCHED";
      const contact = event.customerId
        ? await this.db.whatsAppContact.findFirst({
            where: { organizationId: event.organizationId, customerId: event.customerId },
            include: { consents: true },
          })
        : null;
      if (!contact) reason = "CONTACT_NOT_FOUND";
      if (
        event.trigger === "CUSTOMER_INACTIVE" &&
        !contact?.consents.some((x) => x.purpose === "MARKETING" && x.status === "GRANTED")
      )
        reason = "MARKETING_CONSENT_REQUIRED";
      await this.db.whatsAppAutomationExecution.upsert({
        where: {
          automationId_eventKey: {
            automationId: rule.id,
            eventKey: `${event.trigger}:${event.subjectId}`,
          },
        },
        update: {},
        create: {
          automationId: rule.id,
          eventKey: `${event.trigger}:${event.subjectId}`,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          storeId: event.storeId,
          contactId: contact?.id,
          recipientPhone: contact?.normalizedPhone ?? event.phone,
          payload: {
            occurredAt: event.occurredAt.toISOString(),
            ...(event.payload ?? {}),
          } as Prisma.InputJsonValue,
          status: reason ? "SKIPPED" : "QUEUED",
          skipReason: reason,
          completedAt: reason ? new Date() : null,
        },
      });
    }
  }
  async scan(now = new Date()) {
    const rules = await this.db.whatsAppAutomation.findMany({
      where: { isActive: true, trigger: { in: ["PAYMENT_DUE", "CUSTOMER_INACTIVE"] } },
    });
    let emitted = 0;
    for (const r of rules) {
      const c = (r.conditions ?? {}) as { daysAfter?: number; minAmount?: number };
      const cutoff = new Date(now.getTime() - (c.daysAfter ?? 30) * 86400000);
      if (r.trigger === "PAYMENT_DUE") {
        const rows = await this.db.sale.findMany({
          where: {
            store: { orgId: r.organizationId },
            ...(r.storeId ? { storeId: r.storeId } : {}),
            amountDue: { gt: c.minAmount ?? 0 },
            transactionDate: { lte: cutoff },
          },
          take: 100,
          select: {
            id: true,
            storeId: true,
            customerId: true,
            customerPhone: true,
            amountDue: true,
            transactionDate: true,
          },
        });
        for (const x of rows) {
          await this.emit({
            organizationId: r.organizationId,
            storeId: x.storeId,
            trigger: r.trigger,
            subjectType: "SALE",
            subjectId: x.id,
            customerId: x.customerId ?? undefined,
            phone: x.customerPhone ?? undefined,
            amount: Number(x.amountDue),
            occurredAt: x.transactionDate,
          });
          emitted++;
        }
      } else {
        const rows = await this.db.customer.findMany({
          where: {
            orgId: r.organizationId,
            lastVisitAt: { lte: cutoff },
            ...(r.storeId ? { sales: { some: { storeId: r.storeId } } } : {}),
          },
          take: 100,
          select: {
            id: true,
            lastVisitAt: true,
            sales: { take: 1, orderBy: { transactionDate: "desc" }, select: { storeId: true } },
          },
        });
        for (const x of rows) {
          const storeId = r.storeId ?? x.sales[0]?.storeId;
          if (storeId) {
            await this.emit({
              organizationId: r.organizationId,
              storeId,
              trigger: r.trigger,
              subjectType: "CUSTOMER",
              subjectId: x.id,
              customerId: x.id,
              occurredAt: x.lastVisitAt ?? cutoff,
            });
            emitted++;
          }
        }
      }
    }
    return emitted;
  }
  async process(limit = 10) {
    const stale = new Date(Date.now() - 300000);
    const jobs = await this.db.whatsAppAutomationExecution.findMany({
      where: {
        status: "QUEUED",
        availableAt: { lte: new Date() },
        OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
      },
      take: limit,
      orderBy: { availableAt: "asc" },
      include: { automation: { include: { templateDefinition: true } } },
    });
    let processed = 0;
    for (const job of jobs) {
      const token = randomUUID();
      const claim = await this.db.whatsAppAutomationExecution.updateMany({
        where: { id: job.id, status: "QUEUED" },
        data: {
          status: "PROCESSING",
          lockedAt: new Date(),
          lockToken: token,
          attempts: { increment: 1 },
        },
      });
      if (!claim.count) continue;
      try {
        if (!this.communication) throw new Error("AUTOMATION_TRANSPORT_UNAVAILABLE");
        if (!job.recipientPhone || !job.storeId) {
          await this.finish(job.id, token, {
            status: "SKIPPED",
            skipReason: "RECIPIENT_OR_STORE_MISSING",
          });
          continue;
        }
        const marketing = job.automation.trigger === "CUSTOMER_INACTIVE";
        const result = await this.communication.send({
          channel: "WHATSAPP",
          message: {
            organizationId: job.automation.organizationId,
            storeId: job.storeId,
            to: job.recipientPhone,
            purpose: marketing ? "MARKETING" : "OTHER",
            senderPurpose: marketing ? "MARKETING" : "TRANSACTIONAL",
            automationExecutionId: job.id,
            content: {
              type: "TEMPLATE",
              template: {
                key: job.automation.templateDefinition.key,
                language: job.automation.templateDefinition.language,
                version: job.automation.templateDefinition.version,
              },
            },
            reference: { type: "WHATSAPP_AUTOMATION_EXECUTION", id: job.id },
          },
        });
        await this.finish(job.id, token, { status: "SUBMITTED", completedAt: new Date() });
        processed++;
        void result;
      } catch (e) {
        const retry = !isWhatsAppError(e) || e.retryable;
        const message = e instanceof Error ? e.message : "Automation failed";
        if (retry && job.attempts + 1 < 5)
          await this.finish(job.id, token, {
            status: "QUEUED",
            availableAt: new Date(Date.now() + 30000 * 2 ** job.attempts),
            errorMessage: message,
          });
        else
          await this.finish(job.id, token, {
            status: "FAILED",
            errorCode: isWhatsAppError(e) ? e.code : "AUTOMATION_FAILED",
            errorMessage: message,
            completedAt: new Date(),
          });
      }
    }
    return processed;
  }
  private async finish(
    id: string,
    token: string,
    data: Prisma.WhatsAppAutomationExecutionUpdateManyMutationInput
  ) {
    await this.db.whatsAppAutomationExecution.updateMany({
      where: { id, lockToken: token },
      data: { ...data, lockedAt: null, lockToken: null },
    });
  }
}
