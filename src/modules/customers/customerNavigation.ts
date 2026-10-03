export type CustomerNavigationTarget = { page: number; index: number };

type Input = {
  selectedCustomerId: string | null;
  itemIds: string[];
  page: number;
  pageSize: number;
  total: number;
};

export function getCustomerNavigationTargets({
  selectedCustomerId,
  itemIds,
  page,
  pageSize,
  total,
}: Input) {
  const index = selectedCustomerId ? itemIds.indexOf(selectedCustomerId) : -1;
  if (index < 0) return { previous: null, next: null };

  const previous: CustomerNavigationTarget | null =
    index > 0
      ? { page, index: index - 1 }
      : page > 1
        ? { page: page - 1, index: pageSize - 1 }
        : null;
  const next: CustomerNavigationTarget | null =
    index < itemIds.length - 1
      ? { page, index: index + 1 }
      : page * pageSize < total
        ? { page: page + 1, index: 0 }
        : null;

  return { previous, next };
}
