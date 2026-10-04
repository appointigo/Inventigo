import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/auth.middleware";
import { chooseAnalyticsStoreId, AnalyticsStoreScopeError } from "../utils/analyticsStoreScope";

export class AnalyticsAccessError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404) {
    super(message);
  }
}

export async function resolveAnalyticsStoreId(
  user: AuthUser & { orgId: string },
  requestedStoreId: string | null,
) {
  let storeId: string;
  try {
    storeId = chooseAnalyticsStoreId(user.storeId, requestedStoreId);
  } catch (error) {
    if (error instanceof AnalyticsStoreScopeError) {
      throw new AnalyticsAccessError(error.message, error.status);
    }
    throw error;
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId: user.orgId, isActive: true },
    select: { id: true },
  });
  if (!store) throw new AnalyticsAccessError("Store was not found in this organization", 404);
  return store.id;
}
