export type WhatsAppSetupMilestone = {
  key: "authorization" | "waba" | "phone" | "webhook" | "registration" | "template" | "readiness";
  label: string;
  complete: boolean;
  state: string;
  description: string;
};

type SetupEvidence = {
  integrationState: string;
  businessAccounts: Array<{ status: string; phoneNumbers: Array<{ status: string }> }>;
  templateStatuses: string[];
  readiness?: string;
  metaAuthorized?: boolean;
  wabaConnected?: boolean;
  phoneConnected?: boolean;
  webhookSubscribed?: boolean;
  phoneRegistrationComplete?: boolean;
};

export function buildWhatsAppSetupMilestones(evidence: SetupEvidence): WhatsAppSetupMilestone[] {
  const metaAuthorized = evidence.metaAuthorized ?? !["NOT_CONNECTED", "DISCONNECTED"].includes(evidence.integrationState);
  const activeWabas = evidence.businessAccounts.filter(account => account.status === "ACTIVE");
  const activePhones = activeWabas.flatMap(account => account.phoneNumbers).filter(phone => phone.status === "ACTIVE");
  const wabaConnected = evidence.wabaConnected ?? activeWabas.length > 0;
  const phoneConnected = evidence.phoneConnected ?? activePhones.length > 0;
  const webhookSubscribed = evidence.webhookSubscribed ?? evidence.integrationState === "CONNECTED";
  const phoneRegistrationComplete = evidence.phoneRegistrationComplete ?? activePhones.length > 0;
  const templateState = evidence.templateStatuses.includes("APPROVED") ? "APPROVED"
    : evidence.templateStatuses.includes("REJECTED") ? "REJECTED"
      : evidence.templateStatuses.includes("PENDING") ? "PENDING"
        : evidence.templateStatuses.length ? "EXISTS" : "MISSING";
  const ready = evidence.readiness === "READY";

  return [
    { key: "authorization", label: "Meta authorized", complete: metaAuthorized, state: metaAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED", description: metaAuthorized ? "Server-side Meta credentials are stored for this organization." : "Complete Meta authorization to continue." },
    { key: "waba", label: "WABA connected", complete: wabaConnected, state: wabaConnected ? "CONNECTED" : "NOT CONNECTED", description: wabaConnected ? `${activeWabas.length} active WhatsApp Business Account${activeWabas.length === 1 ? "" : "s"}.` : "No active WhatsApp Business Account is persisted." },
    { key: "phone", label: "Phone number connected", complete: phoneConnected, state: phoneConnected ? "CONNECTED" : "NOT CONNECTED", description: phoneConnected ? `${activePhones.length} operational Cloud API phone number${activePhones.length === 1 ? "" : "s"}.` : "No operational phone number is available." },
    { key: "webhook", label: "Webhook subscribed", complete: webhookSubscribed, state: webhookSubscribed ? "SUBSCRIBED" : "ACTION REQUIRED", description: webhookSubscribed ? "The Stockiva Meta app subscription was verified at the last successful sync." : "Sync with Meta to verify the WABA app subscription." },
    { key: "registration", label: "Phone registration", complete: phoneRegistrationComplete, state: phoneRegistrationComplete ? "COMPLETE" : "ACTION REQUIRED", description: phoneRegistrationComplete ? "Meta reports the persisted phone number as operationally connected." : "Complete or verify Cloud API phone registration." },
    { key: "template", label: "Template status", complete: templateState === "APPROVED", state: templateState, description: templateState === "APPROVED" ? "An approved tenant template is available." : templateState === "MISSING" ? "No tenant template has been synchronized." : `Tenant template state is ${templateState.toLowerCase()}.` },
    { key: "readiness", label: "Ready to send", complete: ready, state: ready ? "READY" : "NOT READY", description: ready ? "The transactional messaging readiness checks pass." : "Review remaining sender, template, or Meta setup checks." },
  ];
}
