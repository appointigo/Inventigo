import { prisma } from "./db";

const DEFAULT_STORE_CODE = "MAIN";

/**
 * Get the default store ID for an organization.
 * Finds the "MAIN" store scoped to the given orgId.
 * Use in API routes after extracting orgId from the session.
 */
export const getDefaultStoreId = async (orgId: string): Promise<string> => {
  const store = await prisma.store.findFirst({
    where: { code: DEFAULT_STORE_CODE, orgId },
    select: { id: true },
  });

  if (!store) {
    throw new Error(
      `Default store "${DEFAULT_STORE_CODE}" not found for this organization. Run 'npx prisma db seed' first.`
    );
  }

  return store.id;
}
