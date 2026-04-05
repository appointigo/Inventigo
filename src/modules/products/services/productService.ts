import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Product, ProductFormValues, ProductListFilters } from "../types";
import { imageService } from "@/shared/services/imageService";

/** Normalizes a size label to the suffix used in variantSku, e.g. "UK 6" → "UK6" */
const normalizeSizeLabel = (label: string) =>
  label.trim().toUpperCase().replace(/\s+/g, "");

/** Derives a variant SKU from the product SKU and size label */
const buildVariantSku = (productSku: string, sizeLabel: string) =>
  `${productSku}-${normalizeSizeLabel(sizeLabel)}`;

const buildInclude = (storeId?: string) => ({
  category: { select: { name: true } },
  brand: { select: { name: true } },
  stockEntries: {
    where: storeId ? { storeId } : undefined,
    include: { size: { select: { label: true } } },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (p: any): Product => {
  const stock = (p.stockEntries ?? []).map((e: any) => ({
    sizeId: e.sizeId,
    sizeLabel: e.size.label,
    // Use stored variantSku if present; fall back to auto-generated format for legacy entries
    variantSku: e.variantSku ?? buildVariantSku(p.sku, e.size.label),
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
    // When a storeId is given, only return products that have stock in that store
    if (filters?.storeId) {
      where.stockEntries = { some: { storeId: filters.storeId } };
    }
    const include = buildInclude(filters?.storeId);
    const products = await prisma.product.findMany({ where, include, orderBy: { name: "asc" } });
    return products.map(toDto);
  },

  async getById(orgId: string, id: string, storeId?: string): Promise<Product | null> {
    const include = buildInclude(storeId);
    const p = await prisma.product.findFirst({ where: { id, orgId }, include });
    return p ? toDto(p) : null;
  },

  async getBySku(orgId: string, sku: string): Promise<Product | null> {
    const p = await prisma.product.findFirst({
      where: { orgId, sku: { equals: sku, mode: "insensitive" } },
      include: buildInclude(),
    });
    return p ? toDto(p) : null;
  },

  async getByBarcode(orgId: string, barcode: string): Promise<Product | null> {
    // Tier 1: match product SKU or external barcode
    const bySkuOrBarcode = await prisma.product.findFirst({
      where: {
        orgId,
        OR: [
          { sku: { equals: barcode, mode: "insensitive" } },
          { externalBarcode: { equals: barcode, mode: "insensitive" } },
        ],
      },
      include: buildInclude(),
    });
    if (bySkuOrBarcode) return toDto(bySkuOrBarcode);

    // Tier 2: match a size-level variant SKU (e.g. NK-TS-862-S)
    const stockEntry = await prisma.stockEntry.findFirst({
      where: {
        variantSku: { equals: barcode, mode: "insensitive" },
        product: { orgId },
      },
      select: { productId: true },
    });
    if (stockEntry) {
      const p = await prisma.product.findUnique({
        where: { id: stockEntry.productId },
        include: buildInclude(),
      });
      return p ? toDto(p) : null;
    }

    return null;
  },

  async create(orgId: string, values: ProductFormValues): Promise<Product> {
    // Use the storeId sent by the client (selected store) or fall back to the org's first store
    let storeId = values.storeId ?? null;
    if (!storeId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
      storeId = org?.stores[0]?.id ?? null;
    }

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
        include: buildInclude(storeId ?? undefined),
      });

      // Create a StockEntry for each size that has quantity > 0
      if (storeId && values.sizes?.length) {
        const sizeIds = values.sizes.filter((s) => s.quantity > 0).map((s) => s.sizeId);
        const sizes = await tx.size.findMany({
          where: { id: { in: sizeIds } },
          select: { id: true, label: true },
        });
        const sizeLabelMap = new Map(sizes.map((s) => [s.id, s.label]));
        const stockData = values.sizes
          .filter((s) => s.quantity > 0)
          .map((s) => ({
            productId: product.id,
            sizeId: s.sizeId,
            storeId,
            quantity: s.quantity,
            reorderLevel: s.reorderLevel ?? 5,
            variantSku: buildVariantSku(product.sku, sizeLabelMap.get(s.sizeId) ?? s.sizeId),
          }));
        if (stockData.length) {
          await tx.stockEntry.createMany({ data: stockData });
        }
      }

      // Re-fetch with stock entries included
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: buildInclude(storeId ?? undefined) });
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
        include: buildInclude(values.storeId),
      });

      // Sync stock entries when sizes are provided in the update
      if (values.sizes !== undefined) {
        // Get the store from existing stock entries, the passed storeId, or the org's first store
        const firstEntry = await tx.stockEntry.findFirst({ where: { productId: id } });
        let storeId = values.storeId ?? firstEntry?.storeId ?? null;
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
          const sizeIds = values.sizes.map((s) => s.sizeId);
          const sizes = await tx.size.findMany({
            where: { id: { in: sizeIds } },
            select: { id: true, label: true },
          });
          const sizeLabelMap = new Map(sizes.map((s) => [s.id, s.label]));
          const productSku = (await tx.product.findUnique({ where: { id }, select: { sku: true } }))?.sku ?? id;
          for (const sz of values.sizes) {
            const vSku = buildVariantSku(productSku, sizeLabelMap.get(sz.sizeId) ?? sz.sizeId);
            await tx.stockEntry.upsert({
              where: { productId_sizeId_storeId: { productId: id, sizeId: sz.sizeId, storeId } },
              update: {
                quantity: sz.quantity,
                variantSku: vSku,
                ...(sz.reorderLevel !== undefined && { reorderLevel: sz.reorderLevel }),
              },
              create: { productId: id, sizeId: sz.sizeId, storeId, quantity: sz.quantity, reorderLevel: sz.reorderLevel ?? 5, variantSku: vSku },
            });
          }
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: buildInclude(values.storeId) });
    });

    return toDto(p);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await prisma.product.findFirst({ where: { id, orgId } });
    if (!existing) return false;

    await prisma.$transaction(async (tx) => {
      // Delete in FK dependency order (children first, product last)
      await tx.saleItem.deleteMany({ where: { productId: id } });
      await tx.purchaseOrderItem.deleteMany({ where: { productId: id } });
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.stockEntry.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    return true;
  },
};
