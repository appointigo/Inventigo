export type SubscriptionAccessSource = "PAID" | "SPONSORED" | "NONE";

/** Legacy workspaces stay on their existing path until explicitly migrated. */
export function requiresSubscriptionActivation(billingRequired: boolean, source: SubscriptionAccessSource): boolean {
  return billingRequired && source === "NONE";
}
