import "server-only";
import { Role } from "@prisma/client";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { chooseForecastStoreId, ForecastScopeError } from "./forecastScope";

const roles = new Set<Role>([Role.OWNER, Role.ADMIN, Role.MANAGER]);
export class ForecastRouteError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}
export async function forecastUser() {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) throw new ForecastRouteError("Unauthorized", 401);
  if (!roles.has(user.role)) throw new ForecastRouteError("Forbidden", 403);
  return user;
}
export async function forecastStore(
  user: Awaited<ReturnType<typeof forecastUser>>,
  requested: string | null
) {
  const storeId = chooseForecastStoreId(user.storeId, requested);
  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId: user.orgId, isActive: true },
    select: { id: true, name: true },
  });
  if (!store) throw new ForecastRouteError("Store not found", 404);
  return store;
}
export function forecastError(error: unknown, fallback: string) {
  const known = error instanceof ForecastRouteError || error instanceof ForecastScopeError;
  return Response.json(
    { error: known ? error.message : fallback },
    { status: known ? error.status : 500 }
  );
}
