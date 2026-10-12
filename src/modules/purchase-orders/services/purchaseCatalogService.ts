import "server-only";
import { prisma } from "@/lib/db";
import { buildVariantSku } from "@/shared/services/barcodeService";

export const purchaseCatalogService = {
  async search(
    orgId: string,
    storeId: string,
    input: { search?: string; page?: number; pageSize?: number },
  ) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    const search = input.search?.trim();
    const where = {
      orgId,
      isActive: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
          { brand: { name: { contains: search, mode: "insensitive" as const } } },
          { category: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          imageUrl: true,
          costPrice: true,
          basePrice: true,
          mrp: true,
          attributes: true,
          brand: { select: { id: true, name: true } },
          category: {
            select: {
              id: true,
              name: true,
              sizes: { select: { id: true, label: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
            },
          },
          stockEntries: {
            where: { storeId },
            select: { sizeId: true, quantity: true, variantSku: true },
          },
        },
        orderBy: [{ name: "asc" }, { sku: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products.map((product) => {
        const stockBySize = new Map(product.stockEntries.map((entry) => [entry.sizeId, entry]));
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          brandId: product.brand.id,
          brandName: product.brand.name,
          categoryId: product.category.id,
          categoryName: product.category.name,
          imageUrl: product.imageUrl,
          costPrice: Number(product.costPrice),
          basePrice: Number(product.basePrice),
          mrp: Number(product.mrp),
          attributes: product.attributes,
          variants: product.category.sizes.map((size) => {
            const stock = stockBySize.get(size.id);
            return {
              sizeId: size.id,
              sizeLabel: size.label,
              variantSku: stock?.variantSku ?? buildVariantSku(product.sku, size.label),
              storeQuantity: stock?.quantity ?? 0,
              hasStockEntry: Boolean(stock),
            };
          }),
        };
      }),
      total,
      page,
      pageSize,
    };
  },
};
