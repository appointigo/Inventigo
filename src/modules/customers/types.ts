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
};

export type CustomerDetailDto = CustomerDto & {
  sales: CustomerSaleSummaryDto[];
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
};

export type CustomerListType = "all" | "recent" | "high_spenders" | "inactive";

export type PaginatedCustomersDto = {
  items: CustomerListItemDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type CustomerUpsertInput = {
  name?: string | null;
  mobile?: string;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
};
