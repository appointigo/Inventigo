import "server-only";

export const VERIFIED_META_GRAPH_API_VERSION = "v26.0";

export type WhatsAppPlatformConfigurationErrorCode =
  | "WHATSAPP_SETUP_DISABLED"
  | "WHATSAPP_SETUP_NOT_CONFIGURED"
  | "WHATSAPP_SETUP_MISCONFIGURED";

export class WhatsAppPlatformConfigurationError extends Error {
  constructor(
    readonly code: WhatsAppPlatformConfigurationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "WhatsAppPlatformConfigurationError";
  }
}

export type WhatsAppPlatformConfig = { enabled: boolean; meta?: {
  appId: string; appSecret: string; embeddedSignupConfigId: string;
  embeddedSignupRedirectUri: string; webhookVerifyToken: string; graphApiVersion: string; timeoutMs: number; credentialEncryptionKey: Buffer;
} };

const required = (env: NodeJS.ProcessEnv, key: string) => {
  const value = env[key]?.trim();
  if (!value)
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_NOT_CONFIGURED",
      `${key} is required when WhatsApp is enabled`
    );
  return value;
};

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
  if (value !== "true") return { enabled: false };
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
  const embeddedSignupRedirectUri = required(env, "META_EMBEDDED_SIGNUP_REDIRECT_URI");
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(embeddedSignupRedirectUri);
  } catch {
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "META_EMBEDDED_SIGNUP_REDIRECT_URI must be an absolute URL"
    );
  }
  if (redirectUrl.hash || (redirectUrl.protocol !== "https:" && !(redirectUrl.protocol === "http:" && redirectUrl.hostname === "localhost")))
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "META_EMBEDDED_SIGNUP_REDIRECT_URI must use HTTPS, except on localhost"
    );
  const credentialEncryptionKey = Buffer.from(required(env, "WHATSAPP_CREDENTIAL_ENCRYPTION_KEY"), "base64");
  if (credentialEncryptionKey.length !== 32)
    throw new WhatsAppPlatformConfigurationError(
      "WHATSAPP_SETUP_MISCONFIGURED",
      "WHATSAPP_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  return { enabled: true, meta: {
    appId: required(env, "META_APP_ID"), appSecret: required(env, "META_APP_SECRET"),
    embeddedSignupConfigId: required(env, "META_EMBEDDED_SIGNUP_CONFIG_ID"), embeddedSignupRedirectUri: redirectUrl.toString(), webhookVerifyToken: required(env, "META_WEBHOOK_VERIFY_TOKEN"), graphApiVersion,
    timeoutMs, credentialEncryptionKey,
  } };
}
