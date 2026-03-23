import type { StoreRecord, CreateStoreInput, UpdateStoreInput } from "../types";

// TODO: Replace with Prisma queries when DB is connected
let stores: StoreRecord[] = [
  {
    id: "test-store-001",
    name: "Main Store",
    code: "MAIN",
    address: "123 Main Street, City Center",
    phone: "+91-9876543210",
    isActive: true,
    userCount: 2,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "test-store-002",
    name: "Rare Threads Outlet",
    code: "RARE-THREADS-OUTLET",
    address: "Rare Threads Outlet, 456 Fashion Ave, City Center",
    phone: "+91-9876543210",
    isActive: true,
    userCount: 2,
    createdAt: "2025-01-01T00:00:00Z",
  },
];

let nextId = 2;

export const storeService = {
  async list(): Promise<StoreRecord[]> {
    return [...stores].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<StoreRecord | null> {
    return stores.find((s) => s.id === id) ?? null;
  },

  async create(input: CreateStoreInput): Promise<StoreRecord> {
    if (stores.some((s) => s.code.toLowerCase() === input.code.toLowerCase())) {
      throw new Error("Store code already in use");
    }
    const store: StoreRecord = {
      id: `store-${nextId++}`,
      name: input.name,
      code: input.code.toUpperCase(),
      address: input.address ?? null,
      phone: input.phone ?? null,
      isActive: true,
      userCount: 0,
      createdAt: new Date().toISOString(),
    };
    stores.push(store);
    return store;
  },

  async update(id: string, input: UpdateStoreInput): Promise<StoreRecord | null> {
    const idx = stores.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = stores[idx];
    const updated: StoreRecord = {
      ...existing,
      name: input.name ?? existing.name,
      address: input.address !== undefined ? (input.address || null) : existing.address,
      phone: input.phone !== undefined ? (input.phone || null) : existing.phone,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
    };
    stores[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = stores.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    stores[idx] = { ...stores[idx], isActive: false };
    return true;
  },
};
