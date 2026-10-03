type PersistedWhatsAppIntegration = {
  status: string;
  credentialRef: string | null;
  connectedAt: Date | null;
  lastSyncedAt: Date | null;
  businessAccounts: Array<{
    status: string;
    phoneNumbers: Array<{ status: string }>;
  }>;
};

export function buildWhatsAppConnectionStatus<T extends PersistedWhatsAppIntegration>(integration: T | null) {
  if (!integration) return {
    state: "NOT_CONNECTED",
    connectedAt: null,
    lastSyncedAt: null,
    metaAuthorized: false,
    wabaConnected: false,
    phoneConnected: false,
    webhookSubscribed: false,
    phoneRegistrationComplete: false,
    businessAccountCount: 0,
    phoneNumberCount: 0,
    businessAccounts: [],
  };

  const activeWabas = integration.businessAccounts.filter(account => account.status === "ACTIVE");
  const activePhones = activeWabas.flatMap(account => account.phoneNumbers).filter(phone => phone.status === "ACTIVE");
  const connected = integration.status === "CONNECTED";
  return {
    state: integration.status,
    connectedAt: integration.connectedAt?.toISOString() ?? null,
    lastSyncedAt: integration.lastSyncedAt?.toISOString() ?? null,
    metaAuthorized: Boolean(integration.credentialRef) && integration.status !== "DISCONNECTED",
    wabaConnected: activeWabas.length > 0,
    phoneConnected: activePhones.length > 0,
    webhookSubscribed: connected,
    phoneRegistrationComplete: activePhones.length > 0,
    businessAccountCount: integration.businessAccounts.length,
    phoneNumberCount: integration.businessAccounts.reduce((count, account) => count + account.phoneNumbers.length, 0),
    businessAccounts: integration.businessAccounts,
  };
}
