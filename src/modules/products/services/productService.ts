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
    // Resolve the storeId from the org's first store (used for StockEntry)
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    const storeId = org?.stores[0]?.id ?? null;

    const p = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
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

      // Create a StockEntry for each size that has quantity > 0
      if (storeId && values.sizes?.length) {
        const stockData = values.sizes
          .filter((s) => s.quantity > 0)
          .map((s) => ({
            productId: product.id,
            sizeId: s.sizeId,
            storeId,
            quantity: s.quantity,
          }));
        if (stockData.length) {
          await tx.stockEntry.createMany({ data: stockData });
        }
      }

      // Re-fetch with stock entries included
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include });
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

    const p = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
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

      // Sync stock entries when sizes are provided in the update
      if (values.sizes !== undefined) {
        // Get the store from existing stock entries (or org's first store)
        const firstEntry = await tx.stockEntry.findFirst({ where: { productId: id } });
        let storeId = firstEntry?.storeId ?? null;
        if (!storeId) {
          const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } },
          });
          storeId = org?.stores[0]?.id ?? null;
        }

        if (storeId) {
          // Upsert each size entry; remove entries for sizes no longer in the list
          const incomingSizeIds = new Set(values.sizes.map((s) => s.sizeId));
          // Delete removed sizes
          await tx.stockEntry.deleteMany({
            where: { productId: id, storeId, sizeId: { notIn: [...incomingSizeIds] } },
          });
          // Upsert each incoming size
          for (const sz of values.sizes) {
            await tx.stockEntry.upsert({
              where: { productId_sizeId_storeId: { productId: id, sizeId: sz.sizeId, storeId } },
              update: { quantity: sz.quantity },
              create: { productId: id, sizeId: sz.sizeId, storeId, quantity: sz.quantity },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include });
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
