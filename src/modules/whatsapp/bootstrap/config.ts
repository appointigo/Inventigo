import type { TestTenantBootstrapConfig, TestTenantTemplateConfig } from "./types";

const required = (env: NodeJS.ProcessEnv, key: string): string => {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required for the test-tenant WhatsApp bootstrap`);
  return value;
};

const optional = (env: NodeJS.ProcessEnv, key: string): string | undefined =>
  env[key]?.trim() || undefined;

const oneOf = <T extends string>(value: string, key: string, allowed: readonly T[]): T => {
  if (!allowed.includes(value as T)) throw new Error(`${key} has an unsupported value`);
  return value as T;
};

export function loadTestTenantBootstrapConfig(env: NodeJS.ProcessEnv): TestTenantBootstrapConfig {
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") {
    throw new Error("WhatsApp test-tenant bootstrap is disabled outside development/test");
  }
  if (env.P05_WHATSAPP_BOOTSTRAP_ENABLED !== "true") {
    throw new Error("Set P05_WHATSAPP_BOOTSTRAP_ENABLED=true to explicitly enable the bootstrap");
  }

  const templateName = optional(env, "P05_META_TEMPLATE_NAME");
  const templateConfirmed = env.P05_META_TEMPLATE_CONFIRMED_APPROVED === "true";
  if (templateName && !templateConfirmed) {
    throw new Error("P05_META_TEMPLATE_CONFIRMED_APPROVED=true is required for an approved template instance");
  }
  if (!templateName && env.P05_META_TEMPLATE_CONFIRMED_APPROVED !== undefined) {
    throw new Error("P05_META_TEMPLATE_NAME is required when configuring a test template");
  }

  const template: TestTenantTemplateConfig | undefined = templateName
    ? {
        key: required(env, "P05_TEMPLATE_KEY"),
        version: Number(required(env, "P05_TEMPLATE_VERSION")),
        language: required(env, "P05_TEMPLATE_LANGUAGE"),
        purpose: oneOf(required(env, "P05_TEMPLATE_PURPOSE"), "P05_TEMPLATE_PURPOSE", [
          "INVOICE", "PAYMENT_RECEIPT", "PAYMENT_REMINDER", "ORDER_CONFIRMATION", "ORDER_STATUS",
          "MARKETING_PROMOTION", "PRODUCT_LAUNCH", "COUPON", "OTP", "CUSTOM",
        ] as const),
        category: oneOf(required(env, "P05_TEMPLATE_CATEGORY"), "P05_TEMPLATE_CATEGORY", [
          "UTILITY", "MARKETING", "AUTHENTICATION",
        ] as const),
        definitionName: required(env, "P05_TEMPLATE_DEFINITION_NAME"),
        body: required(env, "P05_TEMPLATE_BODY"),
        metaTemplateId: optional(env, "P05_META_TEMPLATE_ID"),
        metaTemplateName: templateName,
        confirmedApproved: true,
      }
    : undefined;

  if (template && (!Number.isInteger(template.version) || template.version < 1)) {
    throw new Error("P05_TEMPLATE_VERSION must be a positive integer");
  }

  const priority = Number(env.P05_SENDER_PRIORITY ?? "0");
  if (!Number.isInteger(priority) || priority < 0) {
    throw new Error("P05_SENDER_PRIORITY must be a non-negative integer");
  }

  return {
    runtimeEnvironment: env.NODE_ENV,
    enabled: true,
    organizationId: required(env, "P05_TEST_ORGANIZATION_ID"),
    storeId: required(env, "P05_TEST_STORE_ID"),
    credentialRef: required(env, "P05_CREDENTIAL_REF"),
    metaBusinessId: optional(env, "P05_META_BUSINESS_ID"),
    metaWabaId: required(env, "P05_META_WABA_ID"),
    businessName: optional(env, "P05_WABA_BUSINESS_NAME"),
    metaPhoneNumberId: required(env, "P05_META_PHONE_NUMBER_ID"),
    displayPhoneNumber: required(env, "P05_DISPLAY_PHONE_NUMBER"),
    normalizedPhoneNumber: optional(env, "P05_NORMALIZED_PHONE_NUMBER"),
    verifiedName: optional(env, "P05_VERIFIED_NAME"),
    senderPurpose: oneOf(env.P05_SENDER_PURPOSE ?? "DEFAULT", "P05_SENDER_PURPOSE", [
      "DEFAULT", "TRANSACTIONAL", "MARKETING", "SUPPORT",
    ] as const),
    senderPriority: priority,
    senderIsDefault: env.P05_SENDER_IS_DEFAULT !== "false",
    template,
  };
}
