// ── Platform-wide Statistics ──────────────────────────────────────────────────

export type PlatformStats = {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalStores: number;
  newOrgsThisMonth: number;
  planDistribution: { plan: string; count: number }[];
  weeklySignups: { week: string; count: number }[];
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

// ── Platform User (cross-org user view) ───────────────────────────────────────

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
};

// ── Platform User Stats ───────────────────────────────────────────────────────

export type PlatformUserStats = {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalOrgs: number;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsData = {
  monthlySignups: number;
  estimatedMRR: number;
  retention30Day: number;
  platformSales: number;
  signupsOverTime: { week: string; count: number }[];
  retention: { period: string; percentage: number }[];
  topOrgsByRevenue: { name: string; revenue: number }[];
  planDistribution: { plan: string; count: number }[];
  revenueByPaymentMethod: { method: string; total: number }[];
};

// ── Audit Log Entry ───────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  performedBy: string;
  performerName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

// ── Feature Flag ──────────────────────────────────────────────────────────────

export type FeatureFlagItem = {
  id: string;
  key: string;
  value: boolean;
  scope: string;
  description: string;
  orgId: string | null;
  orgName: string | null;
  updatedAt: string;
  affectedOrgs: number;
};

// ── Announcement ──────────────────────────────────────────────────────────────

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  severity: string;
  targetPlan: string | null;
  activeFrom: string;
  activeUntil: string | null;
  isActive: boolean;
  createdBy: string;
  creatorName: string | null;
  createdAt: string;
};
