import type { Prisma, PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type { campaignSchema, campaignPreviewSchema } from "../campaignSchemas.ts";
import { WhatsAppCampaignMetricsService } from "./WhatsAppCampaignMetricsService.ts";
type Input = z.infer<typeof campaignSchema>;
type Preview = z.infer<typeof campaignPreviewSchema>;
export class WhatsAppCampaignService {
  constructor(private readonly db: PrismaClient) {}
  async list(organizationId: string) {
    const campaigns = await this.db.whatsAppCampaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        templateDefinition: { select: { name: true, language: true } },
        _count: { select: { stores: true, recipients: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const metrics = new WhatsAppCampaignMetricsService(this.db);
    return Promise.all(
      campaigns.map(async (campaign) => ({
        ...campaign,
        metrics: await metrics.get(organizationId, campaign.id),
      }))
    );
  }
  async get(organizationId: string, id: string) {
    const row = await this.db.whatsAppCampaign.findFirst({
      where: { id, organizationId },
      include: {
        templateDefinition: true,
        stores: { include: { store: true, sender: { include: { phoneNumber: true } } } },
        recipients: {
          include: { contact: { include: { customer: true } } },
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });
    if (!row) throw new Error("Campaign not found");
    const counts = await this.db.whatsAppCampaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    });
    return { ...row, recipientCounts: Object.fromEntries(counts.map((x) => [x.status, x._count])) };
  }
  async options(organizationId: string) {
    const [stores, definitions] = await Promise.all([
      this.db.store.findMany({
        where: { orgId: organizationId, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          whatsappSenders: {
            where: {
              purpose: "MARKETING",
              isActive: true,
              phoneNumber: {
                status: "ACTIVE",
                waba: { status: "ACTIVE", integration: { organizationId, status: "CONNECTED" } },
              },
            },
            select: {
              id: true,
              priority: true,
              isDefault: true,
              phoneNumber: {
                select: {
                  displayPhoneNumber: true,
                  verifiedName: true,
                  waba: { select: { id: true, businessName: true } },
                },
              },
            },
            orderBy: { priority: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      this.db.whatsAppTemplateDefinition.findMany({
        where: {
          category: "MARKETING",
          isActive: true,
          instances: { some: { status: "APPROVED", waba: { integration: { organizationId } } } },
          OR: [
            { scope: "PLATFORM", organizationId: null },
            { scope: "ORGANIZATION", organizationId },
          ],
        },
        select: {
          id: true,
          key: true,
          name: true,
          version: true,
          language: true,
          body: true,
          variables: true,
          instances: {
            where: { status: "APPROVED", waba: { integration: { organizationId } } },
            select: { wabaId: true },
          },
        },
        orderBy: [{ key: "asc" }, { version: "desc" }],
      }),
    ]);
    return { stores, templates: definitions };
  }
  async preview(organizationId: string, input: Preview) {
    await this.validateStores(organizationId, input.stores);
    const contacts = await this.audience(organizationId, input);
    const eligible = contacts.filter((c) =>
      c.consents.some((x) => x.purpose === "MARKETING" && x.status === "GRANTED")
    );
    return {
      totalMatched: contacts.length,
      eligibleCount: eligible.length,
      excludedCount: contacts.length - eligible.length,
      noConsentCount: contacts.length - eligible.length,
      sample: eligible
        .slice(0, 10)
        .map((c) => ({ id: c.id, phone: c.normalizedPhone, name: c.customer?.name ?? null })),
    };
  }
  async create(organizationId: string, input: Input) {
    const context = await this.validate(organizationId, input);
    const contacts = await this.audience(organizationId, input);
    return this.db.$transaction(async (tx) => {
      const campaign = await tx.whatsAppCampaign.create({
        data: {
          organizationId,
          name: input.name,
          templateDefinitionId: input.templateDefinitionId,
          status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          audienceFilters: input.audience as Prisma.InputJsonValue,
          stores: {
            create: input.stores.map((x) => ({ storeId: x.storeId, senderId: x.senderId })),
          },
        },
      });
      if (contacts.length)
        await tx.whatsAppCampaignRecipient.createMany({
          data: contacts.map((contact) => {
            const granted = contact.consents.some(
              (x) => x.purpose === "MARKETING" && x.status === "GRANTED"
            );
            return {
              campaignId: campaign.id,
              contactId: contact.id,
              status: granted ? "ELIGIBLE" : "EXCLUDED",
              exclusionReason: granted ? null : "NO_MARKETING_CONSENT",
              snapshot: {
                normalizedPhone: contact.normalizedPhone,
                customerName: contact.customer?.name ?? null,
              } as Prisma.InputJsonValue,
            };
          }),
        });
      return {
        ...campaign,
        audience: {
          totalMatched: contacts.length,
          eligibleCount: contacts.filter((c) => c.consents.some((x) => x.status === "GRANTED"))
            .length,
          excludedCount: contacts.filter((c) => !c.consents.some((x) => x.status === "GRANTED"))
            .length,
        },
        validatedWabas: context.wabaIds,
      };
    });
  }
  async update(organizationId: string, id: string, input: Input) {
    const existing = await this.db.whatsAppCampaign.findFirst({
      where: { id, organizationId, status: { in: ["DRAFT", "SCHEDULED"] } },
      select: { id: true },
    });
    if (!existing) throw new Error("Campaign not found");
    await this.validate(organizationId, input);
    const contacts = await this.audience(organizationId, input);
    return this.db.$transaction(async (tx) => {
      await tx.whatsAppCampaignStore.deleteMany({ where: { campaignId: id } });
      await tx.whatsAppCampaignRecipient.deleteMany({ where: { campaignId: id } });
      const campaign = await tx.whatsAppCampaign.update({
        where: { id },
        data: {
          name: input.name,
          templateDefinitionId: input.templateDefinitionId,
          status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          audienceFilters: input.audience as Prisma.InputJsonValue,
          stores: {
            create: input.stores.map((x) => ({ storeId: x.storeId, senderId: x.senderId })),
          },
        },
      });
      if (contacts.length)
        await tx.whatsAppCampaignRecipient.createMany({
          data: contacts.map((c) => {
            const granted = c.consents.some(
              (x) => x.purpose === "MARKETING" && x.status === "GRANTED"
            );
            return {
              campaignId: id,
              contactId: c.id,
              status: granted ? "ELIGIBLE" : "EXCLUDED",
              exclusionReason: granted ? null : "NO_MARKETING_CONSENT",
              snapshot: {
                normalizedPhone: c.normalizedPhone,
                customerName: c.customer?.name ?? null,
              } as Prisma.InputJsonValue,
            };
          }),
        });
      return campaign;
    });
  }
  async remove(organizationId: string, id: string) {
    const result = await this.db.whatsAppCampaign.deleteMany({
      where: { id, organizationId, status: { in: ["DRAFT", "SCHEDULED"] } },
    });
    if (!result.count) throw new Error("Campaign not found");
    return { deleted: true };
  }
  private async validate(organizationId: string, input: Input) {
    const senders = await this.validateStores(organizationId, input.stores);
    const wabaIds = [...new Set(senders.map((x) => x.phoneNumber.wabaId))];
    const definition = await this.db.whatsAppTemplateDefinition.findFirst({
      where: {
        id: input.templateDefinitionId,
        category: "MARKETING",
        isActive: true,
        OR: [
          { scope: "PLATFORM", organizationId: null },
          { scope: "ORGANIZATION", organizationId },
        ],
      },
      select: {
        id: true,
        instances: {
          where: { wabaId: { in: wabaIds }, status: "APPROVED" },
          select: { wabaId: true },
        },
      },
    });
    if (!definition || new Set(definition.instances.map((x) => x.wabaId)).size !== wabaIds.length)
      throw new Error("The selected marketing template is not approved for every sender WABA");
    return { wabaIds };
  }
  private async validateStores(organizationId: string, stores: Input["stores"]) {
    const ids = stores.map((x) => x.senderId);
    const senders = await this.db.storeWhatsAppSender.findMany({
      where: {
        id: { in: ids },
        purpose: "MARKETING",
        isActive: true,
        store: { orgId: organizationId, isActive: true },
        phoneNumber: {
          status: "ACTIVE",
          waba: { status: "ACTIVE", integration: { organizationId, status: "CONNECTED" } },
        },
      },
      select: { id: true, storeId: true, phoneNumber: { select: { wabaId: true } } },
    });
    if (
      senders.length !== ids.length ||
      stores.some((x) => !senders.some((s) => s.id === x.senderId && s.storeId === x.storeId))
    )
      throw new Error("Invalid marketing sender selection");
    return senders;
  }
  private audience(organizationId: string, input: Preview) {
    const a = input.audience;
    return this.db.whatsAppContact.findMany({
      where: {
        organizationId,
        stores: { some: { storeId: { in: input.stores.map((x) => x.storeId) } } },
        ...(a.tags.length ||
        a.minTotalSpent !== undefined ||
        a.maxTotalSpent !== undefined ||
        a.lastVisitAfter ||
        a.lastVisitBefore
          ? {
              customer: {
                is: {
                  ...(a.tags.length ? { tags: { hasSome: a.tags } } : {}),
                  ...(a.minTotalSpent !== undefined || a.maxTotalSpent !== undefined
                    ? {
                        totalSpent: {
                          ...(a.minTotalSpent !== undefined ? { gte: a.minTotalSpent } : {}),
                          ...(a.maxTotalSpent !== undefined ? { lte: a.maxTotalSpent } : {}),
                        },
                      }
                    : {}),
                  ...(a.lastVisitAfter || a.lastVisitBefore
                    ? {
                        lastVisitAt: {
                          ...(a.lastVisitAfter ? { gte: new Date(a.lastVisitAfter) } : {}),
                          ...(a.lastVisitBefore ? { lte: new Date(a.lastVisitBefore) } : {}),
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        normalizedPhone: true,
        customer: { select: { name: true } },
        consents: { where: { purpose: "MARKETING" }, select: { purpose: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
