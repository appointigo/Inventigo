export function assertStoreAssignment(userStoreId: string | null, requestedStoreId: string) {
  if (userStoreId && userStoreId !== requestedStoreId) throw new Error("Store access denied");
}

export function assertReferencesResolved(
  requestedIds: string[],
  resolvedIds: string[],
  label: string
) {
  const resolved = new Set(resolvedIds);
  if (requestedIds.some((id) => !resolved.has(id))) throw new Error(`${label} access denied`);
}
