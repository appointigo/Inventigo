import type { PrismaClient, WhatsAppSenderPurpose, WhatsAppTemplatePurpose } from "@prisma/client";
import { selectSenderMapping } from "../repositories/selectSenderMapping.ts";

export type ReadinessStatus = "READY" | "ACTION_REQUIRED" | "SETUP_IN_PROGRESS" | "NOT_CONNECTED";
export type ReadinessCheck = { key: string; label: string; passed: boolean; reason?: string; recommendedAction?: string; href?: string };

const templatePurpose: Partial<Record<WhatsAppSenderPurpose, WhatsAppTemplatePurpose>> = {
  TRANSACTIONAL: "INVOICE",
  MARKETING: "MARKETING_PROMOTION",
};

export class WhatsAppMessagingReadinessService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMessagingReadiness(input: { organizationId: string; storeId?: string; purpose?: WhatsAppSenderPurpose }) {
    const purpose = input.purpose ?? "DEFAULT";
    if (input.storeId) {
      const store = await this.prisma.store.findFirst({ where: { id: input.storeId, orgId: input.organizationId }, select: { id: true } });
      if (!store) throw new Error("STORE_NOT_FOUND");
    }
    const integration = await this.prisma.whatsAppIntegration.findUnique({
      where: { organizationId_provider: { organizationId: input.organizationId, provider: "META" } },
      select: {
        status: true,
        businessAccounts: {
          select: {
            id: true, status: true,
            phoneNumbers: { select: { id: true, status: true, qualityRating: true } },
          },
        },
      },
    });
    const activeWabas = integration?.businessAccounts.filter(waba => waba.status === "ACTIVE") ?? [];
    const usablePhoneIds = activeWabas.flatMap(waba => waba.phoneNumbers.filter(phone => phone.status === "ACTIVE").map(phone => phone.id));
    const mappings = await this.prisma.storeWhatsAppSender.findMany({
      where: {
        isActive: true,
        ...(input.storeId ? { storeId: input.storeId } : { store: { orgId: input.organizationId } }),
        purpose: { in: purpose === "DEFAULT" ? ["DEFAULT"] : [purpose, "DEFAULT"] },
        phoneNumberId: { in: usablePhoneIds },
        phoneNumber: { waba: { integration: { organizationId: input.organizationId } } },
      },
      select: { purpose: true, isDefault: true, phoneNumberId: true, phoneNumber: { select: { wabaId: true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    const mapping = selectSenderMapping(mappings, purpose)?.mapping;
    const requiredPurpose = templatePurpose[purpose];
    const approvedTemplate = requiredPurpose && mapping ? await this.prisma.whatsAppTemplateInstance.findFirst({
      where: { wabaId: mapping.phoneNumber.wabaId, status: "APPROVED", definition: { purpose: requiredPurpose, isActive: true, OR: [{ organizationId: input.organizationId }, { scope: "PLATFORM", organizationId: null }] } },
      select: { id: true },
    }) : null;

    const connected = integration?.status === "CONNECTED";
    const providerActionRequired = Boolean(integration && ["ACTION_REQUIRED", "SUSPENDED", "ERROR"].includes(integration.status));
    const checks: ReadinessCheck[] = [
      { key: "integration", label: "Meta connection", passed: connected, reason: connected ? undefined : providerActionRequired ? `Meta connection is ${integration!.status.toLowerCase().replaceAll("_", " ")}.` : "Connect a Meta WhatsApp account.", recommendedAction: "Open WhatsApp setup", href: "/dashboard/whatsapp" },
      { key: "waba", label: "Active WhatsApp Business Account", passed: activeWabas.length > 0, reason: activeWabas.length ? undefined : "No active WABA is available.", recommendedAction: "Review business accounts", href: "/dashboard/whatsapp/accounts" },
      { key: "phone", label: "Usable phone number", passed: usablePhoneIds.length > 0, reason: usablePhoneIds.length ? undefined : "No active phone number is available on an active WABA.", recommendedAction: "Review phone numbers", href: "/dashboard/whatsapp/phone-numbers" },
      { key: "sender", label: `${purpose} sender mapping`, passed: Boolean(mapping), reason: mapping ? undefined : input.storeId ? `This Store has no usable ${purpose} or DEFAULT sender.` : `No Store has a usable ${purpose} sender.`, recommendedAction: "Configure Store sender mapping", href: "/dashboard/whatsapp/store-mapping" },
      ...(requiredPurpose ? [{ key: "template", label: `Approved ${requiredPurpose.toLowerCase().replaceAll("_", " ")} template`, passed: Boolean(approvedTemplate), reason: approvedTemplate ? undefined : `The selected sender's WABA has no approved ${requiredPurpose.toLowerCase().replaceAll("_", " ")} template.`, recommendedAction: "Review message templates", href: "/dashboard/whatsapp/templates" }] : []),
    ];
    const blockingReasons = checks.filter(check => !check.passed).map(check => check.reason!);
    const recommendedActions = checks.filter(check => !check.passed).map(check => ({ label: check.recommendedAction!, href: check.href! }));
    const overallStatus: ReadinessStatus = !integration || integration.status === "DISCONNECTED" ? "NOT_CONNECTED" : providerActionRequired ? "ACTION_REQUIRED" : blockingReasons.length ? "SETUP_IN_PROGRESS" : "READY";
    return { overallStatus, purpose, storeId: input.storeId ?? null, checks, blockingReasons, recommendedActions, providerSignals: { integrationStatus: integration?.status ?? "NOT_CONNECTED", activeWabaCount: activeWabas.length, activePhoneCount: usablePhoneIds.length } };
  }
}
