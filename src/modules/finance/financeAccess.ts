import "server-only";
import type { AuthUser } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { chooseFinanceStoreId, FinanceAccessError } from "./financeScope";

export { FinanceAccessError } from "./financeScope";

export async function resolveFinanceScope(
  user: AuthUser & { orgId: string },
  requestedStoreId: string | null,
) {
  const storeId = chooseFinanceStoreId(user.storeId, requestedStoreId);
  if (!storeId) return { type: "ORGANIZATION" as const, storeId: null, storeName: "Organization" };
  const store = await prisma.store.findFirst({
    where: { id: storeId, orgId: user.orgId, isActive: true },
    select: { id: true, name: true },
  });
  if (!store) throw new FinanceAccessError("Store was not found in this organization", 404);
  return { type: "STORE" as const, storeId: store.id, storeName: store.name };
}
