import "server-only";
import type { PrismaClient } from "@prisma/client";
import { PrismaWhatsAppRepository } from "../repositories/PrismaWhatsAppRepository.ts";
import { WhatsAppSenderResolver } from "./WhatsAppSenderResolver.ts";
import { extractBodyVariableKeys, hasSupportedInvoiceVariableMapping } from "./invoiceTemplateVariables.ts";

export type EligibleInvoiceTemplate = {
  id: string;
  key: string;
  version: number;
  language: string;
  name: string;
  label: string;
  body: string;
  variableCount: number;
  variableKeys: string[];
};

export type InvoiceTemplateExclusionReason =
  | "WRONG_WABA"
  | "NOT_APPROVED"
  | "NOT_INVOICE_PURPOSE"
  | "NOT_UTILITY"
  | "INACTIVE_TEMPLATE"
  | "MISSING_DOCUMENT_HEADER"
  | "MISSING_VARIABLE_MAPPING";

export function hasDocumentTemplateHeader(header: unknown) {
  if (!header || typeof header !== "object") return false;
  const value = header as Record<string, unknown>;
  return String(value.type ?? "").toUpperCase() === "HEADER" &&
    String(value.format ?? "").toUpperCase() === "DOCUMENT";
}

function countBodyVariables(body: string) {
  return extractBodyVariableKeys(body).length;
}

export class WhatsAppInvoiceTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  async options(organizationId: string, storeId: string, requestId?: string) {
    const startedAt = Date.now();
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, orgId: organizationId, isActive: true },
      select: { id: true, name: true, whatsappProfile: true, invoiceSettings: true },
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
      console.warn("[WhatsApp Invoice Options] sender_unavailable", {
        requestId,
        organizationId,
        storeId,
        reason: error instanceof Error ? error.message : "WHATSAPP_SENDER_UNAVAILABLE",
        durationMs: Date.now() - startedAt,
      });
      return {
        enabled: false as const,
        storeId,
        storeName: store.name,
        sender: null,
        templates: [] as EligibleInvoiceTemplate[],
        defaultTemplateInstanceId: store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null,
        defaultExchangeTemplateInstanceId: store.whatsappProfile?.defaultExchangeInvoiceTemplateInstanceId ?? null,
        defaultWhatsAppEnabled: store.invoiceSettings?.defaultWhatsAppEnabled ?? false,
        warning: error instanceof Error ? error.message : "WhatsApp sender is unavailable",
      };
    }

    const [instances, phoneNumber] = await Promise.all([this.prisma.whatsAppTemplateInstance.findMany({
      where: {
        waba: { integration: { organizationId } },
      },
      select: {
        id: true,
        wabaId: true,
        metaTemplateId: true,
        metaTemplateName: true,
        status: true,
        definition: { select: { key: true, version: true, language: true, displayLabel: true, body: true, header: true, variables: true, buttons: true, source: true, purpose: true, category: true, isActive: true } },
        waba: { select: { metaWabaId: true } },
      },
      orderBy: { metaTemplateName: "asc" },
    }), this.prisma.whatsAppPhoneNumber.findUnique({ where: { id: sender.phoneNumberId }, select: { displayPhoneNumber: true, verifiedName: true } })]);
    const invoiceRelated = instances.filter(item =>
      item.definition.purpose === "INVOICE" ||
      item.definition.purpose === "CUSTOM" ||
      item.definition.key.toLowerCase().includes("invoice") ||
      item.metaTemplateName.toLowerCase().includes("invoice")
    );
    const diagnostics = invoiceRelated.map(item => {
      const exclusionReasons: InvoiceTemplateExclusionReason[] = [];
      if (item.wabaId !== sender.wabaId) exclusionReasons.push("WRONG_WABA");
      if (item.status !== "APPROVED") exclusionReasons.push("NOT_APPROVED");
      if (!(["INVOICE", "CUSTOM"] as string[]).includes(item.definition.purpose)) exclusionReasons.push("NOT_INVOICE_PURPOSE");
      if (item.definition.category !== "UTILITY") exclusionReasons.push("NOT_UTILITY");
      if (!item.definition.isActive) exclusionReasons.push("INACTIVE_TEMPLATE");
      if (!hasDocumentTemplateHeader(item.definition.header)) exclusionReasons.push("MISSING_DOCUMENT_HEADER");
      if (!hasSupportedInvoiceVariableMapping(item.definition.body)) exclusionReasons.push("MISSING_VARIABLE_MAPPING");
      const eligible = item.wabaId === sender.wabaId &&
        item.status === "APPROVED" &&
        (["INVOICE", "CUSTOM"] as string[]).includes(item.definition.purpose) &&
        item.definition.category === "UTILITY" &&
        item.definition.isActive &&
        hasDocumentTemplateHeader(item.definition.header) &&
        hasSupportedInvoiceVariableMapping(item.definition.body);
      return {
        id: item.id,
        metaTemplateId: item.metaTemplateId,
        name: item.metaTemplateName,
        language: item.definition.language,
        category: item.definition.category,
        purpose: item.definition.purpose,
        source: item.definition.source,
        status: item.status,
        wabaId: item.wabaId,
        metaWabaId: item.waba.metaWabaId,
        headerType: item.definition.header && typeof item.definition.header === "object"
          ? String((item.definition.header as Record<string, unknown>).format ?? (item.definition.header as Record<string, unknown>).type ?? "UNKNOWN").toUpperCase()
          : "NONE",
        variableCount: countBodyVariables(item.definition.body),
        eligible,
        exclusionReasons,
      };
    });
    console.info("[WhatsApp Invoice Options] evaluated", {
      requestId,
      organizationId,
      storeId,
      sender: {
        phoneNumberId: sender.phoneNumberId,
        metaPhoneNumberId: sender.metaPhoneNumberId,
        wabaId: sender.wabaId,
      },
      defaultInvoiceTemplateInstanceId: store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null,
      templates: diagnostics,
      durationMs: Date.now() - startedAt,
    });
    const eligibleIds = new Set(diagnostics.filter(item => item.eligible).map(item => item.id));
    const templates = invoiceRelated.filter(item => eligibleIds.has(item.id)).map(item => ({
      id: item.id,
      key: item.definition.key,
      version: item.definition.version,
      language: item.definition.language,
      name: item.metaTemplateName,
      label: item.definition.displayLabel || item.metaTemplateName,
      body: item.definition.body,
      variableCount: countBodyVariables(item.definition.body),
      variableKeys: extractBodyVariableKeys(item.definition.body),
    }));
    const configuredDefault = store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null;
    const configuredExchangeDefault =
      store.whatsappProfile?.defaultExchangeInvoiceTemplateInstanceId ?? null;
    const defaultAvailable = configuredDefault && templates.some(item => item.id === configuredDefault);
    const exchangeDefaultAvailable = configuredExchangeDefault &&
      templates.some(item => item.id === configuredExchangeDefault);
    return {
      enabled: templates.length > 0,
      storeId,
      storeName: store.name,
      sender: { phoneNumberId: sender.phoneNumberId, display: phoneNumber?.verifiedName || phoneNumber?.displayPhoneNumber || sender.metaPhoneNumberId },
      templates,
      diagnostics,
      defaultTemplateInstanceId: defaultAvailable ? configuredDefault : null,
      defaultExchangeTemplateInstanceId: exchangeDefaultAvailable
        ? configuredExchangeDefault
        : null,
      defaultWhatsAppEnabled: store.invoiceSettings?.defaultWhatsAppEnabled ?? false,
      warning: templates.length === 0
        ? "No approved Utility template with a document header is available for this Store sender."
        : configuredDefault && !defaultAvailable
          ? "The configured default invoice template is no longer approved or compatible. Choose another template."
          : configuredExchangeDefault && !exchangeDefaultAvailable
            ? "The configured default exchange invoice template is no longer approved or compatible. Choose another template."
          : null,
    };
  }

  async assertEligible(organizationId: string, storeId: string, templateInstanceId: string, requestId?: string) {
    const options = await this.options(organizationId, storeId, requestId);
    const template = options.templates.find(item => item.id === templateInstanceId);
    if (!template || !options.sender) throw new Error("INVOICE_TEMPLATE_NOT_ELIGIBLE");
    return { template, sender: options.sender };
  }
}
