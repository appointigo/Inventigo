import { Role } from "@prisma/client";

export const ROLES = {
  ADMIN: Role.ADMIN,
  MANAGER: Role.MANAGER,
  STAFF: Role.STAFF,
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.MANAGER]: "Manager",
  [Role.STAFF]: "Staff",
};

export const ROLE_COLORS: Record<Role, string> = {
  [Role.ADMIN]: "red",
  [Role.MANAGER]: "blue",
  [Role.STAFF]: "green",
};
