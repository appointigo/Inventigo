export type InvoiceDesignKey = "CLASSIC" | "PREMIUM" | "COMPACT";

export type InvoicePolicySnapshot = {
  id: string | null;
  version: number | null;
  effectiveFrom: string | null;
  termsText: string | null;
  exchangePolicyText: string | null;
  returnPolicyText: string | null;
  thankYouMessage: string | null;
  storeSubtitle: string | null;
  footerNote: string | null;
  signatureText: string | null;
  qrHelperText: string | null;
};

export type InvoiceConfigurationSnapshot = {
  design: { key: InvoiceDesignKey; version: 1 };
  policy: InvoicePolicySnapshot;
};

export type InvoiceManagementSettings = {
  storeId: string;
  storeName: string;
  designKey: InvoiceDesignKey;
  designVersion: 1;
  defaultWhatsAppEnabled: boolean;
  policy: InvoicePolicySnapshot;
  saleTemplateInstanceId: string | null;
  exchangeTemplateInstanceId: string | null;
};
