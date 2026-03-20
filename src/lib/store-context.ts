import { prisma } from "./db";

const DEFAULT_STORE_CODE = "MAIN";

let cachedStoreId: string | null = null;

/**
 * Get the default store ID.
 * In multi-store mode (future), this will be replaced by StoreProvider context.
 * For now, it returns the "MAIN" store ID from the database.
 */
export async function getDefaultStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;

  const store = await prisma.store.findUnique({
    where: { code: DEFAULT_STORE_CODE },
    select: { id: true },
  });

  if (!store) {
    throw new Error(
      `Default store "${DEFAULT_STORE_CODE}" not found. Run 'npx prisma db seed' first.`
    );
  }

  cachedStoreId = store.id;
  return store.id;
}

/**
 * Reset cached store ID (useful for testing).
 */
export function resetStoreCache() {
  cachedStoreId = null;
}
