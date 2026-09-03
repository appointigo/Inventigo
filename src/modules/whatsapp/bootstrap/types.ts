export type TestTenantTemplateConfig = {
  key: string;
  version: number;
  language: string;
  purpose: "INVOICE" | "PAYMENT_RECEIPT" | "PAYMENT_REMINDER" | "ORDER_CONFIRMATION" | "ORDER_STATUS" | "MARKETING_PROMOTION" | "PRODUCT_LAUNCH" | "COUPON" | "OTP" | "CUSTOM";
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  definitionName: string;
  body: string;
  metaTemplateId?: string;
  metaTemplateName: string;
  confirmedApproved: true;
};

export type TestTenantBootstrapConfig = {
  runtimeEnvironment: "development" | "test";
  enabled: true;
  organizationId: string;
  storeId: string;
  credentialRef: string;
  metaBusinessId?: string;
  metaWabaId: string;
  businessName?: string;
  metaPhoneNumberId: string;
  displayPhoneNumber: string;
  normalizedPhoneNumber?: string;
  verifiedName?: string;
  senderPurpose: "DEFAULT" | "TRANSACTIONAL" | "MARKETING" | "SUPPORT";
  senderPriority: number;
  senderIsDefault: boolean;
  template?: TestTenantTemplateConfig;
};

export type TestTenantBootstrapResult = {
  integrationId: string;
  wabaId: string;
  phoneNumberId: string;
  senderMappingId: string;
  templateInstanceId?: string;
};

