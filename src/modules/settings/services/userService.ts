import { Role } from "@prisma/client";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";

// TODO: Replace with Prisma queries when DB is connected
// Mock users seeded to match auth.ts test credentials
let users: AppUser[] = [
  {
    id: "test-admin-001",
    name: "Test Admin",
    email: "admin@inventigo.com",
    role: Role.ADMIN,
    storeId: null,
    storeName: null,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "test-manager-001",
    name: "Store Manager",
    email: "manager@inventigo.com",
    role: Role.MANAGER,
    storeId: "test-store-001",
    storeName: "Main Store",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "test-staff-001",
    name: "Test Staff",
    email: "staff@inventigo.com",
    role: Role.STAFF,
    storeId: "test-store-001",
    storeName: "Main Store",
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

let nextId = 4;

export const userService = {
  async list(): Promise<AppUser[]> {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<AppUser | null> {
    return users.find((u) => u.id === id) ?? null;
  },

  async create(input: CreateUserInput): Promise<AppUser> {
    if (users.some((u) => u.email === input.email)) {
      throw new Error("Email already in use");
    }
    const now = new Date().toISOString();
    const user: AppUser = {
      id: `user-${nextId++}`,
      name: input.name,
      email: input.email,
      role: input.role,
      storeId: input.storeId,
      storeName: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    return user;
  },

  async update(id: string, input: UpdateUserInput): Promise<AppUser | null> {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const existing = users[idx];
    if (input.email && input.email !== existing.email) {
      if (users.some((u) => u.id !== id && u.email === input.email)) {
        throw new Error("Email already in use");
      }
    }
    const updated: AppUser = {
      ...existing,
      name: input.name ?? existing.name,
      email: input.email ?? existing.email,
      role: input.role ?? existing.role,
      storeId: input.storeId !== undefined ? input.storeId : existing.storeId,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    users[idx] = updated;
    return updated;
  },

  async resetPassword(id: string, _newPassword: string): Promise<boolean> {
    const user = users.find((u) => u.id === id);
    if (!user) return false;
    // TODO: In production — await bcrypt.hash(newPassword, 12) then update DB
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], isActive: false, updatedAt: new Date().toISOString() };
    return true;
  },
};
