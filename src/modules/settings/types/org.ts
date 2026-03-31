import type { Role } from "@prisma/client";

// ── Organization ────────────────────────────────────────────────────────────

export type OrgPlan = "FREE" | "PRO" | "ENTERPRISE";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: OrgPlan;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  storeCount?: number;
};

export type OrgFormValues = {
  name: string;
  logoUrl?: string;
};

// ── Invitation ───────────────────────────────────────────────────────────────

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  inviterName: string;
  expiresAt: string;
  createdAt: string;
};

export type CreateInvitationInput = {
  email: string;
  role: Role;
};

// ── Team Member ──────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
  createdAt: string;
};
