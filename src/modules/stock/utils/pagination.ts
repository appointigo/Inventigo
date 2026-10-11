export const INVENTORY_PAGE_SIZE_OPTIONS: number[] = [10, 20, 50, 100];

export function normalizeInventoryPagination(pageValue: unknown, pageSizeValue: unknown) {
  const page = Math.max(1, Math.floor(Number(pageValue) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSizeValue) || 20)));
  return { page, pageSize };
}

export function validInventoryPage(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
  return Math.min(Math.max(1, page), totalPages);
}
