import { Role } from "@prisma/client";

export const ROLES = {
  SUPER_ADMIN: Role.SUPER_ADMIN,
  OWNER: Role.OWNER,
  ADMIN: Role.ADMIN,
  MANAGER: Role.MANAGER,
  STAFF: Role.STAFF,
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.OWNER]: "Owner",
  [Role.ADMIN]: "Admin",
  [Role.MANAGER]: "Manager",
  [Role.STAFF]: "Staff",
};

export const ROLE_COLORS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "volcano",
  [Role.OWNER]: "purple",
  [Role.ADMIN]: "red",
  [Role.MANAGER]: "blue",
  [Role.STAFF]: "green",
};
