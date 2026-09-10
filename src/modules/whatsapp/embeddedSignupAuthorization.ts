import type { MetaTokenInspection } from "./clients/MetaWhatsAppClient.ts";
import { WhatsAppError } from "./errors.ts";

const REQUIRED_EMBEDDED_SIGNUP_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
] as const;

export function validateEmbeddedSignupAuthorization(input: {
  inspection: MetaTokenInspection;
  expectedAppId: string;
  selectedWabaIds?: string[];
}) {
  const { inspection } = input;
  if (!inspection.isValid) {
    throw new WhatsAppError("META_AUTH_FAILED", "Embedded Signup token is invalid", {
      details: { authReason: "token_invalid" },
    });
  }
  if (inspection.appId !== input.expectedAppId) {
    throw new WhatsAppError("META_AUTH_FAILED", "Embedded Signup token belongs to another app", {
      details: { authReason: "app_id_mismatch" },
    });
  }

  const grantedScopes = new Set([
    ...inspection.scopes,
    ...inspection.granularScopes.map(item => item.scope),
  ]);
  const missingScopes = REQUIRED_EMBEDDED_SIGNUP_SCOPES.filter(
    scope => !grantedScopes.has(scope)
  );
  if (missingScopes.length) {
    throw new WhatsAppError(
      "META_AUTH_FAILED",
      "Embedded Signup did not grant the required WhatsApp permissions",
      { details: { authReason: "required_scopes_missing", missingScopes } }
    );
  }

  const discoveredWabaIds = [...new Set(
    inspection.granularScopes
      .filter(item => item.scope === "whatsapp_business_management")
      .flatMap(item => item.targetIds)
  )];
  const wabaIds = input.selectedWabaIds?.length
    ? [...new Set(input.selectedWabaIds)]
    : discoveredWabaIds;
  if (!wabaIds.length) {
    throw new WhatsAppError(
      "META_WABA_NOT_FOUND",
      "No WhatsApp Business Account was granted to this signup token"
    );
  }
  if (wabaIds.some(id => !discoveredWabaIds.includes(id))) {
    throw new WhatsAppError(
      "EMBEDDED_SIGNUP_ASSET_MISMATCH",
      "Selected WhatsApp account was not granted to this signup token"
    );
  }
  return wabaIds;
}
