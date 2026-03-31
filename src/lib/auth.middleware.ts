import type { Role } from "@prisma/client";
import { auth } from "./auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  orgId: string | null;
};

/**
 * Get the authenticated user from the session.
 * Use in API routes and Server Components.
 */
export const getAuthUser = async (): Promise<AuthUser | null> => {
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    storeId: session.user.storeId,
    orgId: session.user.orgId,
  };
}

/**
 * Require the user to be authenticated. Throws if not.
 * Use in API routes.
 */
export const requireAuth = async (): Promise<AuthUser> => {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require the user to be authenticated and belong to an organization.
 * SUPER_ADMIN has orgId=null — use requireSuperAdmin() for platform routes.
 * All other roles must have an orgId to access org-scoped resources.
 */
export const requireOrgAuth = async (): Promise<AuthUser & { orgId: string }> => {
  const user = await requireAuth();
  if (!user.orgId) {
    throw new Error("Forbidden");
  }
  return user as AuthUser & { orgId: string };
}

/**
 * Require the user to be a SUPER_ADMIN (platform admin only).
 */
export const requireSuperAdmin = async (): Promise<AuthUser> => {
  const user = await requireAuth();
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}

/**
 * Require the user to have a specific role (or higher).
 * Role hierarchy: SUPER_ADMIN > OWNER > ADMIN > MANAGER > STAFF
 */
export const requireRole = async (...allowedRoles: Role[]): Promise<AuthUser> => {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
