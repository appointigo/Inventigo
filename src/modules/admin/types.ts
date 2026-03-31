// ── Platform-wide Statistics ──────────────────────────────────────────────────

export type PlatformStats = {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalStores: number;
  newOrgsThisMonth: number;
  planDistribution: { plan: string; count: number }[];
};

// ── Organization Summary (for admin list view) ────────────────────────────────

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  userCount: number;
  storeCount: number;
  productCount: number;
  createdAt: string;
};

// ── Organization Detail (for admin detail view) ───────────────────────────────

export type OrgDetail = OrgSummary & {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }[];
  stores: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  }[];
};
