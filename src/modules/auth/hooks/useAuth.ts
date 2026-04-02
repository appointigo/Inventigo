"use client";

import { useSession, signOut } from "next-auth/react";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  orgId: string | null;
  orgName: string | null;
};

/**
 * Hook to get the current authenticated user.
 * Returns user data, loading state, and authentication status.
 */
export const useCurrentUser = () => {
  const { data: session, status } = useSession();

  const user: CurrentUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        storeId: session.user.storeId,
        orgId: session.user.orgId,
        orgName: session.user.orgName ?? null,
      }
    : null;

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}

/**
 * Hook for auth actions.
 */
export const useAuth = () => {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  const logout = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
  };
}
