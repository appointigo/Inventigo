export const WHATSAPP_ERROR_CODES = [
  "WHATSAPP_NOT_CONNECTED",
  "WHATSAPP_ACTION_REQUIRED",
  "NO_WHATSAPP_SENDER_CONFIGURED",
  "WABA_NOT_ACTIVE",
  "PHONE_NUMBER_NOT_ACTIVE",
  "TEMPLATE_NOT_FOUND",
  "TEMPLATE_NOT_APPROVED",
  "META_AUTH_FAILED",
  "META_RATE_LIMITED",
  "META_SEND_FAILED",
  "META_PROVIDER_FAILED",
  "META_TIMEOUT",
  "META_INVALID_RESPONSE",
  "EMBEDDED_SIGNUP_INVALID_STATE",
  "EMBEDDED_SIGNUP_INVALID_CODE",
  "EMBEDDED_SIGNUP_ASSET_MISMATCH",
] as const;

export type WhatsAppErrorCode = (typeof WHATSAPP_ERROR_CODES)[number];

export class WhatsAppError extends Error {
  readonly code: WhatsAppErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: WhatsAppErrorCode,
    message: string,
    options?: { retryable?: boolean; cause?: unknown; details?: Record<string, unknown> }
  ) {
    super(message, { cause: options?.cause });
    this.name = "WhatsAppError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
  }
}

export function isWhatsAppError(error: unknown): error is WhatsAppError {
  return error instanceof WhatsAppError;
}
