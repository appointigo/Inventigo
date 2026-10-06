export class FinanceAccessError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404) {
    super(message);
  }
}

export function chooseFinanceStoreId(fixedStoreId: string | null, requestedStoreId: string | null) {
  if (fixedStoreId) {
    if (requestedStoreId && requestedStoreId !== fixedStoreId) {
      throw new FinanceAccessError("You cannot access finance data for another store", 403);
    }
    return fixedStoreId;
  }
  return requestedStoreId || null;
}
