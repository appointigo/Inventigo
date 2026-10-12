import "server-only";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessPurchasing, canManagePurchasing } from "@/lib/rbac";

export class PurchaseRouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function requirePurchaseUser(mode: "read" | "manage" = "read") {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) throw new PurchaseRouteError("Unauthorized", 401);
  const allowed = mode === "manage"
    ? canManagePurchasing(user.role)
    : canAccessPurchasing(user.role);
  if (!allowed) throw new PurchaseRouteError("Forbidden", 403);
  return user;
}

export function purchaseError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = error instanceof PurchaseRouteError
    ? error.status
    : typeof error === "object" && error && "status" in error && typeof error.status === "number"
      ? error.status
      : 400;
  return Response.json({ error: message }, { status });
}
