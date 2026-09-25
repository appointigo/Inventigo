import { z } from "zod";

const optionalPolicyText = z.string().trim().max(4000).nullable();

const invoiceManagementSettingsShape = {
  designKey: z.enum(["CLASSIC", "PREMIUM", "COMPACT"]),
  defaultWhatsAppEnabled: z.boolean(),
  termsText: optionalPolicyText,
  returnPolicyText: optionalPolicyText,
  thankYouMessage: z.string().trim().max(500).nullable(),
  effectiveFrom: z.string().datetime().optional(),
  saleTemplateInstanceId: z.string().uuid().nullable(),
  exchangeTemplateInstanceId: z.string().uuid().nullable(),
};

export const invoiceManagementSettingsSchema = z.object(invoiceManagementSettingsShape).superRefine((value, context) => {
  if (value.defaultWhatsAppEnabled && !value.saleTemplateInstanceId) {
    context.addIssue({
      code: "custom",
      path: ["saleTemplateInstanceId"],
      message: "Choose an approved default sale template before enabling automatic delivery",
    });
  }
});

export const invoiceManagementSettingsUpdateSchema = z.object(invoiceManagementSettingsShape)
  .partial()
  .superRefine((value, context) => {
    if (!Object.keys(value).length) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Supply at least one invoice setting to update",
      });
    }
    if (value.defaultWhatsAppEnabled === true && value.saleTemplateInstanceId === null) {
      context.addIssue({
        code: "custom",
        path: ["saleTemplateInstanceId"],
        message: "Choose an approved default sale template before enabling automatic delivery",
      });
    }
  });
