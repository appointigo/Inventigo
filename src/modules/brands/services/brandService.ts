import type { Brand, BrandFormValues } from "../types";

// TODO: Replace with Prisma queries when DB is connected

let brands: Brand[] = [
  { id: "br-1", name: "Nike", logoUrl: null, isActive: true, productCount: 4, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-2", name: "Adidas", logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-3", name: "Puma", logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-4", name: "Levi's", logoUrl: null, isActive: true, productCount: 2, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "br-5", name: "Allen Solly", logoUrl: null, isActive: true, productCount: 3, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

let nextId = 6;

export const brandService = {
  async list(): Promise<Brand[]> {
    return [...brands].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Brand | null> {
    return brands.find((b) => b.id === id) ?? null;
  },

  async create(values: BrandFormValues): Promise<Brand> {
    const now = new Date().toISOString();
    const brand: Brand = {
      id: `br-${nextId++}`,
      name: values.name,
      logoUrl: values.logoUrl ?? null,
      isActive: values.isActive,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    brands.push(brand);
    return brand;
  },

  async update(id: string, values: Partial<BrandFormValues>): Promise<Brand | null> {
    const idx = brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const existing = brands[idx];
    const updated: Brand = {
      ...existing,
      name: values.name ?? existing.name,
      logoUrl: values.logoUrl !== undefined ? (values.logoUrl ?? null) : existing.logoUrl,
      isActive: values.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    brands[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = brands.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    if (brands[idx].productCount > 0) {
      throw new Error("Cannot delete brand with existing products");
    }
    brands.splice(idx, 1);
    return true;
  },
};
