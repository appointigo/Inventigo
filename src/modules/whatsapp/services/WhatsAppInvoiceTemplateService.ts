import "server-only";
import type { PrismaClient } from "@prisma/client";
import { PrismaWhatsAppRepository } from "../repositories/PrismaWhatsAppRepository.ts";
import { WhatsAppSenderResolver } from "./WhatsAppSenderResolver.ts";

export type EligibleInvoiceTemplate = {
  id: string;
  key: string;
  version: number;
  language: string;
  name: string;
  label: string;
  body: string;
  variableCount: number;
};

export function hasDocumentTemplateHeader(header: unknown) {
  if (!header || typeof header !== "object") return false;
  const value = header as Record<string, unknown>;
  return String(value.type ?? "").toUpperCase() === "HEADER" &&
    String(value.format ?? "").toUpperCase() === "DOCUMENT";
}

function countBodyVariables(body: string) {
  const positions = [...body.matchAll(/\{\{(\d+)\}\}/g)].map(match => Number(match[1]));
  return positions.length ? Math.max(...positions) : 0;
}

export class WhatsAppInvoiceTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  async options(organizationId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, orgId: organizationId, isActive: true },
      select: { id: true, name: true, whatsappProfile: true },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");

    let sender;
    try {
      sender = await new WhatsAppSenderResolver(new PrismaWhatsAppRepository()).resolve({
        organizationId,
        storeId,
        purpose: "TRANSACTIONAL",
      });
    } catch (error) {
      return {
        enabled: false as const,
        storeId,
        storeName: store.name,
        sender: null,
        templates: [] as EligibleInvoiceTemplate[],
        defaultTemplateInstanceId: store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null,
        warning: error instanceof Error ? error.message : "WhatsApp sender is unavailable",
      };
    }

    const [instances, phoneNumber] = await Promise.all([this.prisma.whatsAppTemplateInstance.findMany({
      where: {
        wabaId: sender.wabaId,
        status: "APPROVED",
        waba: { integration: { organizationId } },
        definition: {
          isActive: true,
          category: "UTILITY",
          purpose: { in: ["INVOICE", "CUSTOM"] },
        },
      },
      select: {
        id: true,
        metaTemplateName: true,
        definition: { select: { key: true, version: true, language: true, displayLabel: true, body: true, header: true } },
      },
      orderBy: { metaTemplateName: "asc" },
    }), this.prisma.whatsAppPhoneNumber.findUnique({ where: { id: sender.phoneNumberId }, select: { displayPhoneNumber: true, verifiedName: true } })]);
    const templates = instances.filter(item => hasDocumentTemplateHeader(item.definition.header)).map(item => ({
      id: item.id,
      key: item.definition.key,
      version: item.definition.version,
      language: item.definition.language,
      name: item.metaTemplateName,
      label: item.definition.displayLabel || item.metaTemplateName,
      body: item.definition.body,
      variableCount: countBodyVariables(item.definition.body),
    }));
    const configuredDefault = store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null;
    const defaultAvailable = configuredDefault && templates.some(item => item.id === configuredDefault);
    return {
      enabled: templates.length > 0,
      storeId,
      storeName: store.name,
      sender: { phoneNumberId: sender.phoneNumberId, display: phoneNumber?.verifiedName || phoneNumber?.displayPhoneNumber || sender.metaPhoneNumberId },
      templates,
      defaultTemplateInstanceId: defaultAvailable ? configuredDefault : null,
      warning: templates.length === 0
        ? "No approved Utility template with a document header is available for this Store sender."
        : configuredDefault && !defaultAvailable
          ? "The configured default invoice template is no longer approved or compatible. Choose another template."
          : null,
    };
  }

  async assertEligible(organizationId: string, storeId: string, templateInstanceId: string) {
    const options = await this.options(organizationId, storeId);
    const template = options.templates.find(item => item.id === templateInstanceId);
    if (!template || !options.sender) throw new Error("INVOICE_TEMPLATE_NOT_ELIGIBLE");
    return { template, sender: options.sender };
  }
}
