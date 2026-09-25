export type CustomerDto = {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  lastVisitAt: string | null;
  totalSpent: number;
  totalVisits: number;
  avgOrderValue: number;
  isInactive: boolean;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  preferredStoreId: string | null;
  preferredStoreName: string | null;
};

export type CustomerStatsDto = {
  totalVisits: number;
  totalSpend: number;
  lastPurchaseDate: string | null;
};

export type CustomerSaleSummaryDto = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
  storeName: string;
  paymentStatus: string;
  returnStatus: string;
  items: Array<{ name: string; size: string | null; quantity: number }>;
};

export type CustomerDetailDto = CustomerDto & {
  groups: string[];
  activityStatus: "Recently purchased" | "Past customer" | "Never purchased";
  sales: CustomerSaleSummaryDto[];
  firstPurchaseDate: string | null;
  insights: { topCategories: string[]; commonSizes: string[]; preferredBrands: string[] };
  demandRequests: Array<{
    id: string;
    visitId: string;
    storeName: string;
    requirement: string;
    reason: string;
    status: string;
    requestedQuantity: number;
    fulfilledQuantity: number;
    attributes: Record<string, unknown>;
    createdAt: string;
    followUpStatus: string | null;
    restockAvailable: boolean;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    reason: string | null;
    note: string | null;
    dueAt: string | null;
    storeName: string;
    assigneeName: string | null;
  }>;
  visits: Array<{
    id: string;
    visitedAt: string;
    outcome: string;
    storeName: string;
    notes: string | null;
  }>;
};

export type CustomerListItemDto = {
  id: string;
  name: string | null;
  mobile: string;
  totalSpent: number;
  totalVisits: number;
  avgOrderValue: number;
  lastVisitAt: string | null;
  isInactive: boolean;
  preferredStoreId: string | null;
  preferredStoreName: string | null;
  segment: "Recent" | "Repeat" | "High Value" | "At Risk" | "Lead" | "Inactive";
  relationshipStatus: "Active" | "Cooling" | "Inactive";
  lastPurchaseAt: string | null;
  totalOrders: number;
  groups: string[];
  activityStatus: "Recently purchased" | "Past customer" | "Never purchased";
};

export type CustomerGroupFilter =
  | "all"
  | "recent"
  | "repeat"
  | "high_spenders"
  | "attention"
  | "never_purchased";
export type CustomerListType = CustomerGroupFilter;
export type CustomerSortField = "name" | "spend" | "orders" | "lastPurchase";
export type SortDirection = "asc" | "desc";

export type PaginatedCustomersDto = {
  items: CustomerListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  counts?: Record<CustomerGroupFilter, number>;
  scope?: "store" | "organization";
};

export type CustomerUpsertInput = {
  name?: string | null;
  mobile?: string;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  preferredStoreId?: string | null;
};
