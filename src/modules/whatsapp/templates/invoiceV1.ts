import type { MetaCreateTemplateRequest } from "../clients/MetaWhatsAppClient.ts";

export const INVOICE_V1_DEFINITION_ID = "stockiva-platform-invoice-v1-en-us";

export const invoiceV1Definition = {
  id: INVOICE_V1_DEFINITION_ID,
  organizationId: null,
  scope: "PLATFORM" as const,
  key: "invoice_v1",
  version: 1,
  language: "en_US",
  purpose: "INVOICE" as const,
  category: "UTILITY" as const,
  name: "stockiva_invoice_v1_en_us",
  body: "Hi {{1}}, your invoice {{2}} from {{3}} for {{4}} is ready. You'll receive the invoice document in this chat.",
  footer: "Thank you for shopping with us.",
  variables: [
    { position: 1, key: "customerName", example: "Aarav" },
    { position: 2, key: "invoiceNumber", example: "INV-1001" },
    { position: 3, key: "storeName", example: "Stockiva Store" },
    { position: 4, key: "totalAmount", example: "INR 1,250.00" },
  ],
  isActive: true,
};

export function toMetaTemplateRequest(context: Pick<MetaCreateTemplateRequest, "organizationId" | "credentialRef" | "metaWabaId">, definition: typeof invoiceV1Definition): MetaCreateTemplateRequest {
  return {
    ...context,
    name: definition.name,
    language: definition.language,
    category: definition.category,
    components: [
      { type: "BODY", text: definition.body, example: { bodyText: [definition.variables.map(variable => variable.example)] } },
      ...(definition.footer ? [{ type: "FOOTER" as const, text: definition.footer }] : []),
    ],
  };
}
