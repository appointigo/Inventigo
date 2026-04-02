import { prisma } from "@/lib/db";
import type { StoreRecord, CreateStoreInput, UpdateStoreInput } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRecord = (s: any): StoreRecord => ({
  id: s.id,
  name: s.name,
  code: s.code,
  address: s.address ?? null,
  phone: s.phone ?? null,
  isActive: s.isActive,
  userCount: s._count?.users ?? 0,
  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
});

const storeInclude = { _count: { select: { users: true } } } as const;

export const storeService = {
  async list(orgId: string): Promise<StoreRecord[]> {
    const stores = await prisma.store.findMany({
      where: { orgId },
      include: storeInclude,
      orderBy: { name: "asc" },
    });
    return stores.map(toRecord);
  },

  async getById(orgId: string, id: string): Promise<StoreRecord | null> {
    const store = await prisma.store.findFirst({
      where: { id, orgId },
      include: storeInclude,
    });
    return store ? toRecord(store) : null;
  },

  async create(orgId: string, input: CreateStoreInput): Promise<StoreRecord> {
    const existing = await prisma.store.findFirst({
      where: { code: input.code.toUpperCase(), orgId },
    });
    if (existing) throw new Error("Store code already in use");
    const store = await prisma.store.create({
      data: {
        orgId,
        name: input.name,
        code: input.code.toUpperCase(),
        address: input.address ?? null,
        phone: input.phone ?? null,
      },
      include: storeInclude,
    });
    return toRecord(store);
  },

  async update(orgId: string, id: string, input: UpdateStoreInput): Promise<StoreRecord | null> {
    const existing = await prisma.store.findFirst({ where: { id, orgId } });
    if (!existing) return null;
    const store = await prisma.store.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address !== undefined ? (input.address || null) : undefined,
        phone: input.phone !== undefined ? (input.phone || null) : undefined,
        isActive: input.isActive,
      },
      include: storeInclude,
    });
    return toRecord(store);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.store.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.store.update({ where: { id }, data: { isActive: false } });
    return true;
  },
};
