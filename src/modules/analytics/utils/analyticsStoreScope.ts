export class AnalyticsStoreScopeError extends Error {
  constructor(message: string, readonly status: 400 | 403) {
    super(message);
  }
}

export function chooseAnalyticsStoreId(userStoreId: string | null, requestedStoreId: string | null) {
  if (userStoreId && requestedStoreId && requestedStoreId !== userStoreId) {
    throw new AnalyticsStoreScopeError("Store access denied", 403);
  }
  const storeId = userStoreId ?? requestedStoreId;
  if (!storeId) throw new AnalyticsStoreScopeError("A store must be selected", 400);
  return storeId;
}
