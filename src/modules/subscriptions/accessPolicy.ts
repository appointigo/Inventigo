export type FeatureValue = boolean | number | string | readonly string[];
export type FeatureMap = Readonly<Record<string, FeatureValue>>;

export type CommercialSource = {
  planVersionId: string;
  features: FeatureMap;
  validUntil: Date;
};

export type CommercialInput = {
  subscription?: (CommercialSource & {
    billingStatus: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
    isCurrent: boolean;
  }) | null;
  grants?: readonly (CommercialSource & {
    status: "PENDING" | "APPROVED" | "REVOKED";
    startsAt: Date;
  })[];
  now: Date;
};

export type EffectiveAccess = {
  source: "PAID" | "SPONSORED" | "NONE";
  planVersionId: string | null;
  validUntil: Date | null;
  features: FeatureMap;
};

const noAccess: EffectiveAccess = {
  source: "NONE",
  planVersionId: null,
  validUntil: null,
  features: {},
};

/** A paid-through period survives cancel-at-period-end; pending never activates. */
export function resolveCommercialAccess(input: CommercialInput): EffectiveAccess {
  const { subscription, now } = input;
  if (
    subscription?.isCurrent &&
    subscription.validUntil.getTime() > now.getTime() &&
    ["ACTIVE", "PAST_DUE", "CANCELED"].includes(subscription.billingStatus)
  ) {
    return {
      source: "PAID",
      planVersionId: subscription.planVersionId,
      validUntil: subscription.validUntil,
      features: subscription.features,
    };
  }

  const grant = input.grants
    ?.filter((item) => item.status === "APPROVED" && item.startsAt <= now && item.validUntil > now)
    .sort((a, b) => a.validUntil.getTime() - b.validUntil.getTime())[0];
  if (!grant) return noAccess;
  return {
    source: "SPONSORED",
    planVersionId: grant.planVersionId,
    validUntil: grant.validUntil,
    features: grant.features,
  };
}

export type AccessAction =
  | "subscription:read"
  | "subscription:manage"
  | "pos:sale:create"
  | "inventory:products:write"
  | "stores:create"
  | "team:invite"
  | "reports:read"
  | "purchasing:orders:write"
  | "inventory:transfers:write"
  | "customers:followups:write"
  | "expenses:write";

export type TenantRole = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "MANAGER" | "STAFF";

const rolePermissions: Readonly<Record<AccessAction, readonly TenantRole[]>> = {
  "subscription:read": ["OWNER"],
  "subscription:manage": ["OWNER"],
  "pos:sale:create": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "inventory:products:write": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "stores:create": ["OWNER", "ADMIN"],
  "team:invite": ["OWNER", "ADMIN"],
  "reports:read": ["OWNER", "ADMIN", "MANAGER"],
  "purchasing:orders:write": ["OWNER", "ADMIN", "MANAGER"],
  "inventory:transfers:write": ["OWNER", "ADMIN", "MANAGER"],
  "customers:followups:write": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "expenses:write": ["OWNER", "ADMIN", "MANAGER"],
};

const actionFeature: Readonly<Record<AccessAction, string | null>> = {
  "subscription:read": null,
  "subscription:manage": null,
  "pos:sale:create": "pos.billing",
  "inventory:products:write": "inventory.products",
  "stores:create": null,
  "team:invite": null,
  "reports:read": "analytics.overview",
  "purchasing:orders:write": "purchasing.orders",
  "inventory:transfers:write": "inventory.transfers",
  "customers:followups:write": "customers.followups",
  "expenses:write": "expenses.manage",
};

export type AuthorizationInput = {
  actor: { organizationId: string | null; role: TenantRole; assignedStoreIds: readonly string[] } | null;
  organizationId: string;
  storeId?: string;
  resourceOrganizationId?: string;
  resourceStoreId?: string;
  action: AccessAction;
  quota?: { featureKey: string; used: number };
  access: EffectiveAccess;
};

export type DenialReason =
  | "UNAUTHENTICATED"
  | "TENANT_OUT_OF_SCOPE"
  | "STORE_OUT_OF_SCOPE"
  | "ROLE_DENIED"
  | "SUBSCRIPTION_REQUIRED"
  | "FEATURE_NOT_INCLUDED"
  | "LIMIT_REACHED";

export function authorizeFeature(input: AuthorizationInput): { allowed: true } | { allowed: false; reason: DenialReason } {
  const { actor } = input;
  if (!actor) return { allowed: false, reason: "UNAUTHENTICATED" };
  if (
    actor.organizationId !== input.organizationId ||
    (input.resourceOrganizationId && input.resourceOrganizationId !== input.organizationId)
  ) return { allowed: false, reason: "TENANT_OUT_OF_SCOPE" };
  const allStores = actor.role === "OWNER" || actor.role === "ADMIN";
  if (!allStores && [input.storeId, input.resourceStoreId].some((id) => id && !actor.assignedStoreIds.includes(id))) {
    return { allowed: false, reason: "STORE_OUT_OF_SCOPE" };
  }
  if (!rolePermissions[input.action].includes(actor.role)) return { allowed: false, reason: "ROLE_DENIED" };
  // Billing recovery remains available to an owner after commercial expiry.
  if (input.action === "subscription:read" || input.action === "subscription:manage") return { allowed: true };
  if (input.access.source === "NONE") return { allowed: false, reason: "SUBSCRIPTION_REQUIRED" };
  const requiredFeature = actionFeature[input.action];
  if (requiredFeature && input.access.features[requiredFeature] !== true) {
    return { allowed: false, reason: "FEATURE_NOT_INCLUDED" };
  }
  const requiredQuota = input.action === "stores:create"
    ? "stores.max"
    : input.action === "team:invite"
      ? "team.seats.max"
      : null;
  if (requiredQuota && input.quota?.featureKey !== requiredQuota) return { allowed: false, reason: "LIMIT_REACHED" };
  if (input.quota) {
    const limit = input.access.features[input.quota.featureKey];
    if (typeof limit !== "number" || !Number.isInteger(limit) || input.quota.used >= limit) {
      return { allowed: false, reason: "LIMIT_REACHED" };
    }
  }
  return { allowed: true };
}
