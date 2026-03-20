import type { Role } from "@prisma/client";
import { auth } from "./auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
};

/**
 * Get the authenticated user from the session.
 * Use in API routes and Server Components.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
    storeId: session.user.storeId,
  };
}

/**
 * Require the user to be authenticated. Throws if not.
 * Use in API routes.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require the user to have a specific role (or higher).
 * Role hierarchy: ADMIN > MANAGER > STAFF
 */
export async function requireRole(...allowedRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
