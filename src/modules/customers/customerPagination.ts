export function paginateCustomerRows<T>(
  rows: T[],
  requestedPage: number,
  requestedPageSize: number
) {
  const pageSize = Math.min(100, Math.max(1, Math.trunc(requestedPageSize) || 10));
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const page = totalPages ? Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages) : 1;
  const offset = (page - 1) * pageSize;
  return { items: rows.slice(offset, offset + pageSize), total, page, pageSize, totalPages };
}

export const shouldApplyCustomerSort = (tableAction: string) => tableAction === "sort";
