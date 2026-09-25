import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { invoiceManagementSettingsUpdateSchema } from "../schemas.ts";
import type {
  InvoiceManagementSettings,
} from "../types.ts";
import { resolveInvoiceConfigurationSnapshot } from "./invoiceConfigurationSnapshot.ts";

export { resolveInvoiceConfigurationSnapshot } from "./invoiceConfigurationSnapshot.ts";

type SettingsUpdate = z.infer<typeof invoiceManagementSettingsUpdateSchema>;
type SettingsField = keyof SettingsUpdate;

type TemplateEligibilityValidator = {
  assertEligible(
    organizationId: string,
    storeId: string,
    templateInstanceId: string
  ): Promise<unknown>;
};

export class InvoiceManagementValidationError extends Error {
  constructor(readonly field: SettingsField, message: string) {
    super(message);
    this.name = "InvoiceManagementValidationError";
  }
}

const normalizeText = (value: string | null | undefined) => value?.trim() || null;
const hasOwn = <Key extends PropertyKey>(value: object, key: Key): value is Record<Key, unknown> =>
  Object.prototype.hasOwnProperty.call(value, key);

export class InvoiceManagementService {
  constructor(
    private readonly prisma: PrismaClient,
    private templateValidator?: TemplateEligibilityValidator
  ) {}

  private async getTemplateValidator() {
    if (!this.templateValidator) {
      const { WhatsAppInvoiceTemplateService } = await import(
        "../../whatsapp/services/WhatsAppInvoiceTemplateService.ts"
      );
      this.templateValidator = new WhatsAppInvoiceTemplateService(this.prisma);
    }
    return this.templateValidator;
  }

  async get(organizationId: string, storeId: string): Promise<InvoiceManagementSettings> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, orgId: organizationId },
      select: {
        id: true,
        name: true,
        invoiceSettings: { include: { activePolicyVersion: true } },
        whatsappProfile: {
          select: {
            defaultInvoiceTemplateInstanceId: true,
            defaultExchangeInvoiceTemplateInstanceId: true,
          },
        },
      },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");
    const snapshot = await resolveInvoiceConfigurationSnapshot(
      this.prisma,
      organizationId,
      storeId
    );
    return {
      storeId,
      storeName: store.name,
      designKey: snapshot.design.key,
      designVersion: 1,
      defaultWhatsAppEnabled: store.invoiceSettings?.defaultWhatsAppEnabled ?? false,
      policy: snapshot.policy,
      saleTemplateInstanceId:
        store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null,
      exchangeTemplateInstanceId:
        store.whatsappProfile?.defaultExchangeInvoiceTemplateInstanceId ?? null,
    };
  }

  private async assertTemplate(
    organizationId: string,
    storeId: string,
    field: "saleTemplateInstanceId" | "exchangeTemplateInstanceId",
    templateInstanceId: string | null | undefined
  ) {
    if (!templateInstanceId) return;
    try {
      await (await this.getTemplateValidator()).assertEligible(
        organizationId,
        storeId,
        templateInstanceId
      );
    } catch {
      throw new InvoiceManagementValidationError(
        field,
        field === "saleTemplateInstanceId"
          ? "Choose an approved, compatible DOCUMENT-header sale template for this Store sender"
          : "Choose an approved, compatible DOCUMENT-header exchange template for this Store sender"
      );
    }
  }

  async save(organizationId: string, storeId: string, input: SettingsUpdate) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, orgId: organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        whatsappProfile: {
          select: {
            defaultInvoiceTemplateInstanceId: true,
            defaultExchangeInvoiceTemplateInstanceId: true,
          },
        },
        invoiceSettings: {
          select: { defaultWhatsAppEnabled: true },
        },
      },
    });
    if (!store) throw new Error("STORE_NOT_FOUND");

    const saleTemplateId = hasOwn(input, "saleTemplateInstanceId")
      ? input.saleTemplateInstanceId
      : store.whatsappProfile?.defaultInvoiceTemplateInstanceId ?? null;
    const resultingDeliveryEnabled = hasOwn(input, "defaultWhatsAppEnabled")
      ? input.defaultWhatsAppEnabled
      : store.invoiceSettings?.defaultWhatsAppEnabled ?? false;
    if (hasOwn(input, "saleTemplateInstanceId")) {
      await this.assertTemplate(
        organizationId,
        storeId,
        "saleTemplateInstanceId",
        input.saleTemplateInstanceId
      );
    }
    if (hasOwn(input, "exchangeTemplateInstanceId")) {
      await this.assertTemplate(
        organizationId,
        storeId,
        "exchangeTemplateInstanceId",
        input.exchangeTemplateInstanceId
      );
    }
    if (
      resultingDeliveryEnabled &&
      (hasOwn(input, "defaultWhatsAppEnabled") ||
        hasOwn(input, "saleTemplateInstanceId"))
    ) {
      if (!saleTemplateId) {
        throw new InvoiceManagementValidationError(
          "saleTemplateInstanceId",
          "Choose an approved default sale template before enabling automatic delivery"
        );
      }
      if (!hasOwn(input, "saleTemplateInstanceId")) {
        await this.assertTemplate(
          organizationId,
          storeId,
          "saleTemplateInstanceId",
          saleTemplateId
        );
      }
    }

    const touchesPolicy = [
      "termsText",
      "exchangePolicyText",
      "returnPolicyText",
      "thankYouMessage",
      "storeSubtitle",
      "footerNote",
      "signatureText",
      "qrHelperText",
      "effectiveFrom",
    ].some(field => hasOwn(input, field));
    const touchesSettings =
      hasOwn(input, "designKey") ||
      hasOwn(input, "defaultWhatsAppEnabled") ||
      touchesPolicy;
    const touchesTemplates =
      hasOwn(input, "saleTemplateInstanceId") ||
      hasOwn(input, "exchangeTemplateInstanceId");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const current = await tx.storeInvoiceSettings.findUnique({
            where: { storeId },
            include: { activePolicyVersion: true },
          });
          const active = current?.activePolicyVersion;
          const policyData = {
            termsText: hasOwn(input, "termsText")
              ? normalizeText(input.termsText)
              : active?.termsText ?? null,
            exchangePolicyText: hasOwn(input, "exchangePolicyText")
              ? normalizeText(input.exchangePolicyText)
              : active?.exchangePolicyText ?? null,
            returnPolicyText: hasOwn(input, "returnPolicyText")
              ? normalizeText(input.returnPolicyText)
              : active?.returnPolicyText ?? null,
            thankYouMessage: hasOwn(input, "thankYouMessage")
              ? normalizeText(input.thankYouMessage)
              : active?.thankYouMessage ?? null,
            storeSubtitle: hasOwn(input, "storeSubtitle") ? normalizeText(input.storeSubtitle) : active?.storeSubtitle ?? null,
            footerNote: hasOwn(input, "footerNote") ? normalizeText(input.footerNote) : active?.footerNote ?? null,
            signatureText: hasOwn(input, "signatureText") ? normalizeText(input.signatureText) : active?.signatureText ?? null,
            qrHelperText: hasOwn(input, "qrHelperText") ? normalizeText(input.qrHelperText) : active?.qrHelperText ?? null,
          };
          const effectiveFrom = input.effectiveFrom
            ? new Date(input.effectiveFrom)
            : new Date();
          const policyChanged = touchesPolicy && (
            (active?.termsText ?? null) !== policyData.termsText ||
            (active?.returnPolicyText ?? null) !== policyData.returnPolicyText ||
            (active?.thankYouMessage ?? null) !== policyData.thankYouMessage ||
            (hasOwn(input, "effectiveFrom") &&
              active?.effectiveFrom.getTime() !== effectiveFrom.getTime())
          );
          let policyVersionId = active?.id ?? null;
          if (
            policyChanged &&
            (Boolean(active) ||
              Object.values(policyData).some(Boolean) ||
              hasOwn(input, "effectiveFrom"))
          ) {
            const latest = await tx.invoicePolicyVersion.aggregate({
              where: { storeId },
              _max: { version: true },
            });
            const policy = await tx.invoicePolicyVersion.create({
              data: {
                storeId,
                version: (latest._max.version ?? 0) + 1,
                ...policyData,
                effectiveFrom,
              },
              select: { id: true },
            });
            policyVersionId = policy.id;
          }
          if (touchesSettings) {
            await tx.storeInvoiceSettings.upsert({
              where: { storeId },
              create: {
                storeId,
                designKey: input.designKey ?? current?.designKey ?? "CLASSIC",
                designVersion: 1,
                defaultWhatsAppEnabled:
                  input.defaultWhatsAppEnabled ??
                  current?.defaultWhatsAppEnabled ??
                  false,
                activePolicyVersionId: policyVersionId,
              },
              update: {
                ...(hasOwn(input, "designKey")
                  ? { designKey: input.designKey, designVersion: 1 }
                  : {}),
                ...(hasOwn(input, "defaultWhatsAppEnabled")
                  ? { defaultWhatsAppEnabled: input.defaultWhatsAppEnabled }
                  : {}),
                ...(policyChanged ? { activePolicyVersionId: policyVersionId } : {}),
              },
            });
          }
          if (touchesTemplates) {
            await tx.storeWhatsAppProfile.upsert({
              where: { storeId },
              create: {
                storeId,
                displayName: store.name,
                defaultLanguage: "en",
                defaultInvoiceTemplateInstanceId:
                  input.saleTemplateInstanceId ?? null,
                defaultExchangeInvoiceTemplateInstanceId:
                  input.exchangeTemplateInstanceId ?? null,
              },
              update: {
                ...(hasOwn(input, "saleTemplateInstanceId")
                  ? {
                      defaultInvoiceTemplateInstanceId:
                        input.saleTemplateInstanceId,
                    }
                  : {}),
                ...(hasOwn(input, "exchangeTemplateInstanceId")
                  ? {
                      defaultExchangeInvoiceTemplateInstanceId:
                        input.exchangeTemplateInstanceId,
                    }
                  : {}),
              },
            });
          }
        });
        return this.get(organizationId, storeId);
      } catch (error) {
        if (
          attempt < 2 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("INVOICE_SETTINGS_SAVE_FAILED");
  }
}
