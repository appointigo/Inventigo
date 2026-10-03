import type { DirectoryFilters } from "./components/CustomerList";
import type { CustomerListType, CustomerSortField, SortDirection } from "./types";

export type CustomerDirectoryState = {
  search: string;
  type: CustomerListType;
  page: number;
  pageSize: number;
  sortBy: CustomerSortField;
  sortDirection: SortDirection;
  filters: DirectoryFilters;
  storeId?: string | null;
};

const types: CustomerListType[] = [
  "all",
  "recent",
  "repeat",
  "high_spenders",
  "attention",
  "never_purchased",
];
const sortFields: CustomerSortField[] = ["name", "spend", "orders", "lastPurchase"];
const number = (params: URLSearchParams, key: string) => {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function parseCustomerDirectoryState(
  params: URLSearchParams
): Partial<CustomerDirectoryState> {
  const type = params.get("type") as CustomerListType | null;
  const sortBy = params.get("sortBy") as CustomerSortField | null;
  const sortDirection = params.get("sortDirection") as SortDirection | null;
  const lastPurchaseDays = number(params, "lastPurchaseDays");
  return {
    search: params.get("search") ?? "",
    type: type && types.includes(type) ? type : "all",
    page: Math.max(1, number(params, "page") ?? 1),
    pageSize: Math.min(100, Math.max(1, number(params, "pageSize") ?? 10)),
    sortBy: sortBy && sortFields.includes(sortBy) ? sortBy : "lastPurchase",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
    storeId: params.get("storeId"),
    filters: {
      ...(lastPurchaseDays && [7, 30, 90, 180].includes(lastPurchaseDays)
        ? { lastPurchaseDays: lastPurchaseDays as 7 | 30 | 90 | 180 }
        : {}),
      minSpend: number(params, "minSpend"),
      maxSpend: number(params, "maxSpend"),
      minOrders: number(params, "minOrders"),
      maxOrders: number(params, "maxOrders"),
    },
  };
}

export function serializeCustomerDirectoryState(state: CustomerDirectoryState) {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.type !== "all") params.set("type", state.type);
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.pageSize !== 10) params.set("pageSize", String(state.pageSize));
  if (state.sortBy !== "lastPurchase") params.set("sortBy", state.sortBy);
  if (state.sortDirection !== "desc") params.set("sortDirection", state.sortDirection);
  if (state.storeId) params.set("storeId", state.storeId);
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return params;
}

export const customerProfileHref = (customerId: string, state: CustomerDirectoryState) => {
  const query = serializeCustomerDirectoryState(state).toString();
  const returnTo = `/dashboard/customers${query ? `?${query}` : ""}`;
  return `/dashboard/customers/${encodeURIComponent(customerId)}?returnTo=${encodeURIComponent(returnTo)}`;
};

export const safeCustomerReturnPath = (value: string | null) =>
  value?.startsWith("/dashboard/customers") && !value.startsWith("//")
    ? value
    : "/dashboard/customers";
