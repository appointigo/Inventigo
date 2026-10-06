export class ForecastScopeError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403
  ) {
    super(message);
  }
}

export function chooseForecastStoreId(
  fixedStoreId: string | null,
  requestedStoreId: string | null
) {
  if (fixedStoreId) {
    if (requestedStoreId && requestedStoreId !== fixedStoreId)
      throw new ForecastScopeError("Store access denied", 403);
    return fixedStoreId;
  }
  if (!requestedStoreId)
    throw new ForecastScopeError("A store must be selected for forecasting", 400);
  return requestedStoreId;
}
