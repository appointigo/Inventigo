import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Product, ProductFormValues, ProductListFilters } from "../types";
import { imageService } from "@/shared/services/imageService";

const include = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
  stockEntries: {
    include: { size: { select: { label: true } } },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (p: any): Product => {
  const stock = (p.stockEntries ?? []).map((e: any) => ({
    sizeId: e.sizeId,
    sizeLabel: e.size.label,
    variantSku: null,
    quantity: e.quantity,
    reorderLevel: e.reorderLevel,
  }));
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    externalBarcode: p.externalBarcode ?? null,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    brandId: p.brandId,
    brandName: p.brand.name,
    basePrice: Number(p.basePrice),
    costPrice: Number(p.costPrice),
    attributes: p.attributes as Record<string, unknown>,
    imageUrl: p.imageUrl ?? null,
    isActive: p.isActive,
    stock,
    totalStock: stock.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
};

export const productService = {
  async list(orgId: string, filters?: ProductListFilters): Promise<Product[]> {
    const where: Record<string, unknown> = { orgId };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.brandId) where.brandId = filters.brandId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    const products = await prisma.product.findMany({ where, include, orderBy: { name: "asc" } });
    return products.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<Product | null> {
    const p = await prisma.product.findFirst({ where: { id, orgId }, include });
    return p ? toDto(p) : null;
  },

  async getBySku(orgId: string, sku: string): Promise<Product | null> {
    const p = await prisma.product.findFirst({
      where: { orgId, sku: { equals: sku, mode: "insensitive" } },
      include,
    });
    return p ? toDto(p) : null;
  },

  async getByBarcode(orgId: string, barcode: string): Promise<Product | null> {
    const p = await prisma.product.findFirst({
      where: {
        orgId,
        OR: [
          { sku: { equals: barcode, mode: "insensitive" } },
          { externalBarcode: { equals: barcode, mode: "insensitive" } },
        ],
      },
      include,
    });
    return p ? toDto(p) : null;
  },

  async create(orgId: string, values: ProductFormValues): Promise<Product> {
    const p = await prisma.product.create({
      data: {
        orgId,
        name: values.name,
        sku: values.sku,
        externalBarcode: values.externalBarcode ?? null,
        categoryId: values.categoryId,
        brandId: values.brandId,
        basePrice: values.basePrice,
        costPrice: values.costPrice,
        attributes: (values.attributes ?? {}) as Prisma.InputJsonValue,
        imageUrl: values.imageUrl ?? null,
        isActive: values.isActive,
      },
      include,
    });
    return toDto(p);
  },

  async update(orgId: string, id: string, values: Partial<ProductFormValues>): Promise<Product | null> {
    const existing = await prisma.product.findFirst({ where: { id, orgId } });
    if (!existing) return null;

    const incomingImageUrl = values.imageUrl !== undefined ? (values.imageUrl ?? null) : existing.imageUrl;
    if (
      existing.imageUrl &&
      incomingImageUrl !== existing.imageUrl &&
      existing.imageUrl.includes("vercel-storage.com")
    ) {
      await imageService.delete(existing.imageUrl);
    }

    const p = await prisma.product.update({
      where: { id },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(values.sku !== undefined && { sku: values.sku }),
        ...(values.externalBarcode !== undefined && { externalBarcode: values.externalBarcode ?? null }),
        ...(values.categoryId !== undefined && { categoryId: values.categoryId }),
        ...(values.brandId !== undefined && { brandId: values.brandId }),
        ...(values.basePrice !== undefined && { basePrice: values.basePrice }),
        ...(values.costPrice !== undefined && { costPrice: values.costPrice }),
        ...(values.attributes !== undefined && { attributes: values.attributes as Prisma.InputJsonValue }),
        ...(values.isActive !== undefined && { isActive: values.isActive }),
        imageUrl: incomingImageUrl,
      } as Prisma.ProductUpdateInput,
      include,
    });
    return toDto(p);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.product.findFirst({ where: { id, orgId } });
    if (!existing) return false;
    await prisma.product.delete({ where: { id } });
    return true;
  },
};
