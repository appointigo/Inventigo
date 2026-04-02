import { prisma } from "@/lib/db";
import type { Brand, BrandFormValues } from "../types";

type BrandWithCount = {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
};

const toDto = (b: BrandWithCount): Brand => ({
  id: b.id,
  name: b.name,
  logoUrl: b.logoUrl,
  isActive: b.isActive,
  productCount: b._count.products,
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});

export const brandService = {
  async list(orgId: string): Promise<Brand[]> {
    const brands = await prisma.brand.findMany({
      where: { orgId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return brands.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<Brand | null> {
    const b = await prisma.brand.findFirst({
      where: { id, orgId },
      include: { _count: { select: { products: true } } },
    });
    return b ? toDto(b) : null;
  },

  async create(orgId: string, values: BrandFormValues): Promise<Brand> {
    const b = await prisma.brand.create({
      data: { orgId, name: values.name, logoUrl: values.logoUrl ?? null, isActive: values.isActive },
      include: { _count: { select: { products: true } } },
    });
    return toDto(b);
  },

  async update(orgId: string, id: string, values: Partial<BrandFormValues>): Promise<Brand | null> {
    const existing = await prisma.brand.findFirst({ where: { id, orgId } });
    if (!existing) return null;
    const b = await prisma.brand.update({
      where: { id },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(values.logoUrl !== undefined && { logoUrl: values.logoUrl ?? null }),
        ...(values.isActive !== undefined && { isActive: values.isActive }),
      },
      include: { _count: { select: { products: true } } },
    });
    return toDto(b);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const b = await prisma.brand.findFirst({
      where: { id, orgId },
      include: { _count: { select: { products: true } } },
    });
    if (!b) return false;
    if (b._count.products > 0) throw new Error("Cannot delete brand with existing products");
    await prisma.brand.delete({ where: { id } });
    return true;
  },
};
