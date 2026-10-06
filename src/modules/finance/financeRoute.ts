import "server-only";
import { Role } from "@prisma/client";
import { requireOrgAuth } from "@/lib/auth.middleware";

const financeRoles = new Set<Role>([Role.OWNER, Role.ADMIN, Role.MANAGER]);

export class FinanceRouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function requireFinanceUser() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) throw new FinanceRouteError("Unauthorized", 401);
  if (!financeRoles.has(user.role)) throw new FinanceRouteError("Forbidden", 403);
  return user;
}

export function financeError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = error instanceof FinanceRouteError
    ? error.status
    : typeof error === "object" && error && "status" in error && typeof error.status === "number"
      ? error.status
      : 400;
  return Response.json({ error: message }, { status });
}
