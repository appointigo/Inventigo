import type { PrismaClient } from "@prisma/client";
import { buildSetupProgress } from "../overview.ts";
import { WhatsAppMessagingReadinessService } from "./WhatsAppMessagingReadinessService.ts";
if (typeof window !== "undefined") throw new Error("WhatsAppOverviewService is server-only");

export class WhatsAppOverviewService {
  private readonly readinessService: WhatsAppMessagingReadinessService;
  constructor(private readonly prisma: PrismaClient, readinessService?: WhatsAppMessagingReadinessService) {
    this.readinessService = readinessService ?? new WhatsAppMessagingReadinessService(prisma);
  }
  async get(organizationId: string) {
    const [integration, mappings, templates, profiles, readiness] = await Promise.all([
      this.prisma.whatsAppIntegration.findUnique({
        where: { organizationId_provider: { organizationId, provider: "META" } },
        select: {
          status: true,
          connectedAt: true,
          lastSyncedAt: true,
          businessAccounts: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              metaWabaId: true,
              businessName: true,
              status: true,
              lastSyncedAt: true,
              phoneNumbers: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  metaPhoneNumberId: true,
                  displayPhoneNumber: true,
                  verifiedName: true,
                  status: true,
                  qualityRating: true,
                  lastSyncedAt: true,
                  storeMappings: {
                    where: { isActive: true },
                    select: {
                      id: true,
                      purpose: true,
                      isDefault: true,
                      priority: true,
                      store: { select: { id: true, name: true, code: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.storeWhatsAppSender.findMany({
        where: {
          isActive: true,
          store: { orgId: organizationId },
          phoneNumber: { waba: { integration: { organizationId } } },
        },
        select: { purpose: true },
      }),
      this.prisma.whatsAppTemplateInstance.findMany({
        where: { waba: { integration: { organizationId } } },
        select: { status: true },
      }),
      this.prisma.storeWhatsAppProfile.findMany({
        where: { store: { orgId: organizationId } },
        select: {
          id: true,
          displayName: true,
          signature: true,
          supportPhone: true,
          defaultLanguage: true,
          store: { select: { id: true, name: true, code: true } },
        },
        orderBy: { store: { name: "asc" } },
      }),
      this.readinessService.getMessagingReadiness({ organizationId }),
    ]);
    const wabas = integration?.businessAccounts ?? [];
    const phones = wabas.flatMap((waba) => waba.phoneNumbers);
    const countBy = (values: string[]) =>
      Object.fromEntries(
        [...new Set(values)]
          .sort()
          .map((value) => [value, values.filter((item) => item === value).length])
      );
    const evidence = {
      connectionStatus: integration?.status,
      activeWabas: wabas.filter((waba) => waba.status === "ACTIVE").length,
      activePhones: phones.filter((phone) => phone.status === "ACTIVE").length,
      activeMappings: mappings.length,
      approvedTemplates: templates.filter((template) => template.status === "APPROVED").length,
      configuredProfiles: profiles.length,
    };
    return {
      connection: {
        status: integration?.status ?? "NOT_CONNECTED",
        connectedAt: integration?.connectedAt ?? null,
        lastSyncedAt: integration?.lastSyncedAt ?? null,
      },
      wabas: {
        total: wabas.length,
        active: evidence.activeWabas,
        items: wabas.map(({ phoneNumbers, ...waba }) => ({
          ...waba,
          phoneCount: phoneNumbers.length,
        })),
      },
      phoneNumbers: { total: phones.length, active: evidence.activePhones, items: phones },
      storeMappings: {
        total: mappings.length,
        byPurpose: countBy(mappings.map((mapping) => mapping.purpose)),
      },
      templates: {
        total: templates.length,
        approved: evidence.approvedTemplates,
        byStatus: countBy(templates.map((template) => template.status)),
      },
      storeProfiles: { total: profiles.length, items: profiles },
      readiness: readiness.overallStatus,
      readinessDetails: readiness,
      setupProgress: buildSetupProgress(evidence),
    };
  }
}
