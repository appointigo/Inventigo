export type OverviewEvidence = {
  connectionStatus?: string;
  activeWabas: number;
  activePhones: number;
  activeMappings: number;
  approvedTemplates: number;
  configuredProfiles: number;
};
export type MessagingReadiness =
  | "NOT_CONNECTED"
  | "ACTION_REQUIRED"
  | "SETUP_IN_PROGRESS"
  | "READY";
export function deriveWhatsAppReadiness(e: OverviewEvidence): MessagingReadiness {
  if (!e.connectionStatus || e.connectionStatus === "DISCONNECTED") return "NOT_CONNECTED";
  if (["ACTION_REQUIRED", "SUSPENDED", "ERROR"].includes(e.connectionStatus))
    return "ACTION_REQUIRED";
  if (
    e.connectionStatus === "CONNECTED" &&
    e.activeWabas > 0 &&
    e.activePhones > 0 &&
    e.activeMappings > 0 &&
    e.approvedTemplates > 0
  )
    return "READY";
  return "SETUP_IN_PROGRESS";
}
export function buildSetupProgress(e: OverviewEvidence) {
  const steps = [
    { key: "connection", label: "Meta connected", complete: e.connectionStatus === "CONNECTED" },
    { key: "waba", label: "Active business account", complete: e.activeWabas > 0 },
    { key: "phone", label: "Active phone number", complete: e.activePhones > 0 },
    { key: "mapping", label: "Store sender mapped", complete: e.activeMappings > 0 },
    { key: "profile", label: "Store profile configured", complete: e.configuredProfiles > 0 },
    { key: "template", label: "Approved template available", complete: e.approvedTemplates > 0 },
  ];
  const completed = steps.filter((step) => step.complete).length;
  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    steps,
  };
}
