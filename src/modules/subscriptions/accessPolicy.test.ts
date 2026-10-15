import assert from "node:assert/strict";
import test from "node:test";
import { authorizeFeature, resolveCommercialAccess } from "./accessPolicy.ts";

const now = new Date("2026-10-14T12:00:00.000Z");
const later = new Date("2026-11-14T12:00:00.000Z");
const earlier = new Date("2026-10-13T12:00:00.000Z");
const features = { "pos.billing": true, "analytics.overview": true, "stores.max": 1, "team.seats.max": 3 };
const paid = {
  planVersionId: "starter-v1",
  features,
  validUntil: later,
  billingStatus: "ACTIVE" as const,
  isCurrent: true,
};

test("paid access needs a current verified period; cancel-at-period-end retains it", () => {
  assert.equal(resolveCommercialAccess({ now, subscription: paid }).source, "PAID");
  assert.equal(resolveCommercialAccess({ now, subscription: { ...paid, billingStatus: "CANCELED" } }).source, "PAID");
  assert.equal(resolveCommercialAccess({ now, subscription: { ...paid, billingStatus: "PENDING" } }).source, "NONE");
  assert.equal(resolveCommercialAccess({ now, subscription: { ...paid, validUntil: earlier } }).source, "NONE");
  assert.equal(resolveCommercialAccess({ now, subscription: { ...paid, isCurrent: false } }).source, "NONE");
});

test("dated approved sponsorship is independent of cash collection", () => {
  const sponsored = resolveCommercialAccess({
    now,
    grants: [{ planVersionId: "growth-v1", features, startsAt: earlier, validUntil: later, status: "APPROVED" }],
  });
  assert.equal(sponsored.source, "SPONSORED");
  assert.equal(resolveCommercialAccess({ now: later, grants: [{ planVersionId: "growth-v1", features, startsAt: earlier, validUntil: later, status: "APPROVED" }] }).source, "NONE");
});

test("tenant, role, store and quota checks stay independent of the plan", () => {
  const access = resolveCommercialAccess({ now, subscription: paid });
  const owner = { organizationId: "org-a", role: "OWNER" as const, assignedStoreIds: ["store-a"] };
  const staff = { organizationId: "org-a", role: "STAFF" as const, assignedStoreIds: ["store-a"] };
  const base = { organizationId: "org-a", access };

  assert.deepEqual(authorizeFeature({ ...base, actor: owner, action: "pos:sale:create", storeId: "store-b", resourceOrganizationId: "org-b" }), { allowed: false, reason: "TENANT_OUT_OF_SCOPE" });
  assert.deepEqual(authorizeFeature({ ...base, actor: staff, action: "pos:sale:create", storeId: "store-b" }), { allowed: false, reason: "STORE_OUT_OF_SCOPE" });
  assert.deepEqual(authorizeFeature({ ...base, actor: staff, action: "subscription:manage" }), { allowed: false, reason: "ROLE_DENIED" });
  assert.deepEqual(authorizeFeature({ ...base, actor: owner, action: "stores:create", quota: { featureKey: "stores.max", used: 1 } }), { allowed: false, reason: "LIMIT_REACHED" });
  assert.deepEqual(authorizeFeature({ ...base, actor: owner, action: "stores:create", quota: { featureKey: "stores.max", used: 0 } }), { allowed: true });
  assert.deepEqual(authorizeFeature({ ...base, actor: owner, action: "purchasing:orders:write" }), { allowed: false, reason: "FEATURE_NOT_INCLUDED" });
  assert.deepEqual(authorizeFeature({ ...base, actor: owner, action: "pos:sale:create" }), { allowed: true });
});

test("billing recovery remains available to an owner after expiry", () => {
  const access = resolveCommercialAccess({ now, subscription: { ...paid, validUntil: earlier } });
  const actor = { organizationId: "org-a", role: "OWNER" as const, assignedStoreIds: [] };
  assert.deepEqual(authorizeFeature({ actor, organizationId: "org-a", access, action: "subscription:manage" }), { allowed: true });
  assert.deepEqual(authorizeFeature({ actor, organizationId: "org-a", access, action: "pos:sale:create" }), { allowed: false, reason: "SUBSCRIPTION_REQUIRED" });
});
