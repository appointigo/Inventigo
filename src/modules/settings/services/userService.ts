import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";

const managedRoles: Set<Role> = new Set([Role.ADMIN, Role.MANAGER, Role.STAFF]);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateRoleAndStore(role: Role, storeId: string | null | undefined) {
  if (!managedRoles.has(role)) {
    throw new Error("Only Admin, Manager, and Staff users can be created here");
  }
  if ((role === Role.MANAGER || role === Role.STAFF) && !storeId) {
    throw new Error("Manager and Staff users must be assigned to a store");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppUser(user: any): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId ?? null,
    storeName: user.store?.name ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  };
}

const userInclude = {
  store: { select: { name: true } },
} as const;

export const userService = {
  async list(orgId: string): Promise<AppUser[]> {
    const users = await prisma.user.findMany({
      where: { orgId },
      include: userInclude,
      orderBy: { name: "asc" },
    });
    return users.map(toAppUser);
  },

  async getById(orgId: string, id: string): Promise<AppUser | null> {
    const user = await prisma.user.findFirst({
      where: { id, orgId },
      include: userInclude,
    });
    return user ? toAppUser(user) : null;
  },

  async create(orgId: string, input: CreateUserInput): Promise<AppUser> {
    const email = normalizeEmail(input.email);
    validateRoleAndStore(input.role, input.storeId);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new Error("Email already in use");
    }

    if (input.storeId) {
      const store = await prisma.store.findFirst({
        where: { id: input.storeId, orgId, isActive: true },
        select: { id: true },
      });
      if (!store) {
        throw new Error("Assigned store not found");
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        orgId,
        name: input.name.trim(),
        email,
        passwordHash,
        role: input.role,
        storeId: input.storeId,
        isActive: true,
        emailVerified: true,
      },
      include: userInclude,
    });
    return toAppUser(user);
  },

  async update(orgId: string, id: string, input: UpdateUserInput): Promise<AppUser | null> {
    const existing = await prisma.user.findFirst({
      where: { id, orgId },
      include: userInclude,
    });
    if (!existing) return null;

    const nextRole = input.role ?? existing.role;
    const nextStoreId = input.storeId !== undefined ? input.storeId : existing.storeId;
    validateRoleAndStore(nextRole, nextStoreId);

    const nextEmail = input.email ? normalizeEmail(input.email) : existing.email;
    if (nextEmail !== existing.email) {
      const taken = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (taken && taken.id !== id) {
        throw new Error("Email already in use");
      }
    }

    if (nextStoreId) {
      const store = await prisma.store.findFirst({
        where: { id: nextStoreId, orgId, isActive: true },
        select: { id: true },
      });
      if (!store) {
        throw new Error("Assigned store not found");
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? existing.name,
        email: nextEmail,
        role: nextRole,
        storeId: nextStoreId,
        isActive: input.isActive,
      },
      include: userInclude,
    });
    return toAppUser(updated);
  },

  async resetPassword(orgId: string, id: string, newPassword: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id, orgId },
      select: { id: true },
    });
    if (!user) return false;

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return true;
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.user.findFirst({
      where: { id, orgId },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return true;
  },
};
