import type { WhatsAppSenderPurpose } from "../types";

export type SenderMappingCandidate = {
  purpose: WhatsAppSenderPurpose;
  isDefault: boolean;
};

export function selectSenderMapping<T extends SenderMappingCandidate>(
  candidatesInPriorityOrder: T[],
  purpose: WhatsAppSenderPurpose
): { mapping: T; resolution: "EXACT_DEFAULT" | "EXACT_PRIORITY" | "STORE_DEFAULT" } | null {
  const exact = candidatesInPriorityOrder.filter((candidate) => candidate.purpose === purpose);
  const exactDefault = exact.find((candidate) => candidate.isDefault);
  if (exactDefault) return { mapping: exactDefault, resolution: "EXACT_DEFAULT" };
  if (exact[0]) return { mapping: exact[0], resolution: "EXACT_PRIORITY" };

  const storeDefaults = candidatesInPriorityOrder.filter((candidate) => candidate.purpose === "DEFAULT");
  const fallback = storeDefaults.find((candidate) => candidate.isDefault) ?? storeDefaults[0];
  return fallback ? { mapping: fallback, resolution: "STORE_DEFAULT" } : null;
}

