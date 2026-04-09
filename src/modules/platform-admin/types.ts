// Re-export backend types so UI imports from one place
export type { PlatformStats, OrgSummary, OrgDetail, PlatformUser, PlatformUserStats, AnalyticsData, AuditLogEntry, FeatureFlagItem, AnnouncementItem } from "@/modules/admin/types";

// ── Weekly signup data (populated by stats API) ────────────────────────────

export type WeeklySignup = {
  week: string; // e.g. "W1", "W2"
  count: number;
};

// ── Plan definition (frontend-only for now) ────────────────────────────────

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type PlanFeature = {
  key: string;
  label: string;
  enabled: boolean;
};

export type PricingPlan = {
  id: string;
  name: string;
  price: number;          // monthly price in USD
  maxUsers: number;       // -1 = unlimited
  maxStores: number;      // -1 = unlimited
  maxProducts: number;    // -1 = unlimited
  features: PlanFeature[];
  tagline?: string;
  orgsCount?: number;     // hydrated from org data
};

// ── Platform admin nav ─────────────────────────────────────────────────────

export type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// ── Org detail panel state ─────────────────────────────────────────────────

export type OrgPanelState = {
  open: boolean;
  orgId: string | null;
};
