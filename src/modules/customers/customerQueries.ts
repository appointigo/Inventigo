import type { CustomerListType, CustomerSortField, SortDirection } from "./types";
import type { DirectoryFilters } from "./components/CustomerList";

export type CustomerDirectoryQuery = {
  storeId?: string | null;
  search: string;
  type: CustomerListType;
  page: number;
  pageSize: number;
  sortBy: CustomerSortField;
  sortDirection: SortDirection;
  filters: DirectoryFilters;
};

export const customerDirectoryQueryKey = (query: CustomerDirectoryQuery) =>
  ["customers", "directory", query] as const;
export const customerDetailQueryKey = (customerId: string | null) =>
  ["customers", "detail", customerId] as const;

export function customerDirectorySearchParams(query: CustomerDirectoryQuery) {
  const params = new URLSearchParams({
    type: query.type,
    page: String(query.page),
    pageSize: String(query.pageSize),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });
  if (query.storeId) params.set("storeId", query.storeId);
  if (query.search.trim()) params.set("search", query.search.trim());
  Object.entries(query.filters).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return params;
}
