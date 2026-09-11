import type { MetaTokenInspection } from "./clients/MetaWhatsAppClient.ts";
import type { MetaPhoneNumber } from "./clients/MetaWhatsAppClient.ts";
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
    throw new WhatsAppError("META_TOKEN_INVALID", "Embedded Signup token is invalid", {
      details: { authReason: "token_invalid" },
    });
  }
  if (inspection.appId !== input.expectedAppId) {
    throw new WhatsAppError("META_TOKEN_INVALID", "Embedded Signup token belongs to another app", {
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
      "META_PERMISSION_MISSING",
      "Embedded Signup did not grant the required WhatsApp permissions",
      { details: { authReason: "required_scopes_missing", missingScopes } }
    );
  }

  const discoveredWabaIds = [...new Set(
    inspection.granularScopes
      .filter(item => item.scope === "whatsapp_business_management")
      .flatMap(item => item.targetIds)
  )];
  if (!discoveredWabaIds.length) {
    throw new WhatsAppError(
      "WABA_NOT_FOUND",
      "No WhatsApp Business Account was granted to this signup token"
    );
  }
  const selectedWabaIds = [...new Set(input.selectedWabaIds ?? [])];
  if (selectedWabaIds.some(id => !discoveredWabaIds.includes(id))) {
    throw new WhatsAppError(
      "EMBEDDED_SIGNUP_ASSET_MISMATCH",
      "Selected WhatsApp account was not granted to this signup token"
    );
  }
  if (selectedWabaIds.length > 1 || (!selectedWabaIds.length && discoveredWabaIds.length > 1)) {
    throw new WhatsAppError(
      "MULTIPLE_WABAS_REQUIRE_SELECTION",
      "Choose one authorized WhatsApp Business Account to continue",
      { details: { candidateWabaIds: discoveredWabaIds } }
    );
  }
  return selectedWabaIds.length ? selectedWabaIds : discoveredWabaIds;
}

export function selectEmbeddedSignupPhoneNumber(
  phones: MetaPhoneNumber[],
  selectedPhoneNumberId?: string
) {
  if (!phones.length) {
    throw new WhatsAppError(
      "PHONE_NUMBER_NOT_FOUND",
      "No WhatsApp phone number is available for this business account"
    );
  }
  if (selectedPhoneNumberId) {
    const selected = phones.find(phone => phone.id === selectedPhoneNumberId);
    if (!selected) {
      throw new WhatsAppError(
        "EMBEDDED_SIGNUP_ASSET_MISMATCH",
        "Selected WhatsApp phone number was not granted to this signup attempt"
      );
    }
    return selected;
  }
  if (phones.length > 1) {
    throw new WhatsAppError(
      "MULTIPLE_PHONE_NUMBERS_REQUIRE_SELECTION",
      "Choose one WhatsApp phone number to continue",
      { details: { candidatePhoneNumbers: phones.map(phone => ({
        id: phone.id,
        displayPhoneNumber: phone.displayPhoneNumber,
        verifiedName: phone.verifiedName,
        qualityRating: phone.qualityRating,
        nameStatus: phone.nameStatus,
      })) } }
    );
  }
  return phones[0]!;
}

export function isEmbeddedSignupPhoneRegistered(phone: MetaPhoneNumber) {
  return phone.status?.toUpperCase() === "CONNECTED";
}
