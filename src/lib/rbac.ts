import type { Role } from "@prisma/client";
import type { AuthUser } from "./auth.middleware";

export function canManageUsers(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canReadTeam(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "OWNER") {
    return targetRole === "ADMIN" || targetRole === "MANAGER" || targetRole === "STAFF";
  }
  if (actorRole === "ADMIN") {
    return targetRole === "MANAGER" || targetRole === "STAFF";
  }
  return false;
}

export function requiresStoreAssignment(role: Role): boolean {
  return role === "MANAGER" || role === "STAFF";
}

export function getTeamScope(user: AuthUser & { orgId: string }): { orgId: string; storeId?: string } {
  if (user.role === "MANAGER" && user.storeId) {
    return { orgId: user.orgId, storeId: user.storeId };
  }
  return { orgId: user.orgId };
}