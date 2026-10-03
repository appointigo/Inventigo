import { isWhatsAppError } from "./errors.ts";

export type WhatsAppFailureDiagnostic = {
  stage: string;
  upstreamHttpStatus?: number;
  metaErrorCode?: number;
  metaErrorSubcode?: number;
  metaErrorType?: string;
  metaContentType?: string;
  sanitizedMetaMessage?: string;
  fbtraceId?: string;
  durationMs: number;
};

export function isWhatsAppDebugDiagnosticsEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.WHATSAPP_DEBUG_DIAGNOSTICS?.trim().toLowerCase() === "true";
}

export function buildWhatsAppFailureDiagnostic(
  error: unknown,
  stage: string,
  durationMs: number
): WhatsAppFailureDiagnostic {
  const details = isWhatsAppError(error) ? error.details : undefined;
  return {
    stage,
    upstreamHttpStatus: asNumber(details?.httpStatus),
    metaErrorCode: asNumber(details?.providerCode),
    metaErrorSubcode: asNumber(details?.providerSubcode),
    metaErrorType: asString(details?.providerType),
    metaContentType: asString(details?.contentType),
    sanitizedMetaMessage: asString(details?.providerMessage),
    fbtraceId: asString(details?.traceId),
    durationMs,
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
