import type { Brand, BrandFormValues } from "../types";
import { getOrgData } from "@/lib/mock-org-store";

// TODO: Replace with Prisma queries when DB is connected

export const brandService = {
  async list(orgId: string): Promise<Brand[]> {
    const { brands } = getOrgData(orgId);
    return [...brands].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(orgId: string, id: string): Promise<Brand | null> {
    const { brands } = getOrgData(orgId);
    return brands.find((b) => b.id === id) ?? null;
  },

  async create(orgId: string, values: BrandFormValues): Promise<Brand> {
    const data = getOrgData(orgId);
    const now = new Date().toISOString();
    const brand: Brand = {
      id: `br-${data.brandNextId++}`,
      name: values.name,
      logoUrl: values.logoUrl ?? null,
      isActive: values.isActive,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.brands.push(brand);
    return brand;
  },

  async update(orgId: string, id: string, values: Partial<BrandFormValues>): Promise<Brand | null> {
    const data = getOrgData(orgId);
    const idx = data.brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const existing = data.brands[idx];
    const updated: Brand = {
      ...existing,
      name: values.name ?? existing.name,
      logoUrl: values.logoUrl !== undefined ? (values.logoUrl ?? null) : existing.logoUrl,
      isActive: values.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    data.brands[idx] = updated;
    return updated;
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const data = getOrgData(orgId);
    const idx = data.brands.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    if (data.brands[idx].productCount > 0) {
      throw new Error("Cannot delete brand with existing products");
    }
    data.brands.splice(idx, 1);
    return true;
  },
};
