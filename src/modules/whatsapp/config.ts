import "server-only";

import { parseWhatsAppAllowedOrigins } from "./security/origin";

export const VERIFIED_META_GRAPH_API_VERSION = "v26.0";

export type WhatsAppPlatformConfigurationErrorCode =
  | "WHATSAPP_SETUP_DISABLED"
  | "WHATSAPP_CONFIGURATION_MISSING"
  | "WHATSAPP_SETUP_MISCONFIGURED";

export const REQUIRED_WHATSAPP_CONFIGURATION = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_EMBEDDED_SIGNUP_CONFIG_ID",
  "META_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_ALLOWED_ORIGINS",
  "WHATSAPP_CREDENTIAL_ENCRYPTION_KEY",
] as const;

type RequiredWhatsAppConfigurationKey =
  (typeof REQUIRED_WHATSAPP_CONFIGURATION)[number];
type WhatsAppDisabledReason = "feature_flag_missing" | "feature_flag_false";

export class WhatsAppPlatformConfigurationError extends Error {
  constructor(
    readonly code: WhatsAppPlatformConfigurationErrorCode,
    message: string,
    readonly missingConfiguration: readonly RequiredWhatsAppConfigurationKey[] = [],
    readonly disabledReason?: WhatsAppDisabledReason
  ) {
    super(message);
    this.name = "WhatsAppPlatformConfigurationError";
  }
}

export type WhatsAppPlatformConfig =
  | { enabled: false; disabledReason: WhatsAppDisabledReason }
  | { enabled: true; meta: {
    appId: string; appSecret: string; embeddedSignupConfigId: string;
    allowedOrigins: readonly string[]; webhookVerifyToken: string; graphApiVersion: string; timeoutMs: number; credentialEncryptionKey: Buffer;
  } };

/**
 * Only a platform-wide feature switch is recognized before P07.
 * Tenant Meta assets and credentials must be resolved from persistence.
 */
export function getWhatsAppPlatformConfig(
  env: NodeJS.ProcessEnv = process.env
): WhatsAppPlatformConfig {
  const value = env.WHATSAPP_ENABLED?.trim().toLowerCase();
  if (value !== undefined && value !== "true" && value !== "false") {
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "WHATSAPP_ENABLED must be either true or false"
    );
  }
  if (value !== "true") return {
    enabled: false,
    disabledReason: value === "false" ? "feature_flag_false" : "feature_flag_missing",
  };
  const missingConfiguration = REQUIRED_WHATSAPP_CONFIGURATION.filter(
    key => !env[key]?.trim()
  );
  if (missingConfiguration.length) {
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_CONFIGURATION_MISSING",
      `Required WhatsApp configuration is missing: ${missingConfiguration.join(", ")}`,
      missingConfiguration
    );
  }
  const required = (key: RequiredWhatsAppConfigurationKey) => env[key]!.trim();
  const graphApiVersion = env.META_GRAPH_API_VERSION?.trim() || VERIFIED_META_GRAPH_API_VERSION;
  if (!/^v\d+\.\d+$/.test(graphApiVersion))
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "META_GRAPH_API_VERSION must look like v26.0"
    );
  const timeoutMs = Number(env.META_GRAPH_TIMEOUT_MS || 10_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000)
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "META_GRAPH_TIMEOUT_MS must be between 1000 and 60000"
    );
  let allowedOrigins: readonly string[];
  try {
    allowedOrigins = parseWhatsAppAllowedOrigins(required("WHATSAPP_ALLOWED_ORIGINS"));
  } catch (error) {
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      error instanceof Error ? error.message : "WHATSAPP_ALLOWED_ORIGINS is invalid"
    );
  }
  const credentialEncryptionKey = Buffer.from(required("WHATSAPP_CREDENTIAL_ENCRYPTION_KEY"), "base64");
  if (credentialEncryptionKey.length !== 32)
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "WHATSAPP_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  return { enabled: true, meta: {
    appId: required("META_APP_ID"), appSecret: required("META_APP_SECRET"),
    embeddedSignupConfigId: required("META_EMBEDDED_SIGNUP_CONFIG_ID"), allowedOrigins, webhookVerifyToken: required("META_WEBHOOK_VERIFY_TOKEN"), graphApiVersion,
    timeoutMs, credentialEncryptionKey,
  } };
}
