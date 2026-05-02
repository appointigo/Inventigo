import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { Product, ProductFormValues, ProductListFilters, BulkProductValidated, BulkUploadResult, PaginatedProductsResponse } from "../types";
import { imageService } from "@/shared/services/imageService";
import { normalizeNameKey, normalizeSku } from "@/shared/utils/normalization";
import { buildVariantSku, normalizeSizeLabel, sanitizeScannedBarcode } from "@/shared/services/barcodeService";

const buildInclude = (storeId?: string) => ({
  category: { select: { name: true } },
  brand: { select: { name: true } },
  stockEntries: {
    where: storeId ? { storeId } : undefined,
    include: { size: { select: { label: true } } },
  },
});

type ProductAttributeFilterValue = string | number | boolean | Array<string | number | boolean>;

type ProductQueryFilters = ProductListFilters & {
  attributeFilters?: Record<string, ProductAttributeFilterValue>;
  categoryAttributeSchema?: { fields: Array<{ name: string; type: string; options?: string[]; required: boolean }> };
};

const buildProductWhere = (orgId: string, filters?: ProductListFilters) => {
  const where: Record<string, unknown> = { orgId };

  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.brandId) where.brandId = filters.brandId;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { externalBarcode: { contains: filters.search, mode: "insensitive" } },
      { stockEntries: { some: { variantSku: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  if (filters?.storeId || filters?.sizeId) {
    where.stockEntries = {
      some: {
        ...(filters?.storeId ? { storeId: filters.storeId } : {}),
        ...(filters?.sizeId ? { sizeId: filters.sizeId } : {}),
      },
    };
  }

  return where;
};

const buildAttributeConditions = (
  schema: ProductQueryFilters["categoryAttributeSchema"],
  attributeFilters?: Record<string, ProductAttributeFilterValue>
) => {
  if (!schema?.fields?.length || !attributeFilters) return [];

  return schema.fields.flatMap((field) => {
    const rawValue = attributeFilters[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return [];
    }

    const values = Array.isArray(rawValue)
      ? rawValue
      : String(rawValue).split(",").map((item) => item.trim()).filter(Boolean);

    if (values.length === 0) {
      return [];
    }

    const buildCondition = (value: string | number | boolean) => {
      if (field.type === "boolean") {
        if (value === "true" || value === true) {
          return { attributes: { path: [field.name], equals: true } };
        }
        if (value === "false" || value === false) {
          return { attributes: { path: [field.name], equals: false } };
        }
        return null;
      }

      if (field.type === "number") {
        const numeric = Number(value);
        return Number.isFinite(numeric)
          ? { attributes: { path: [field.name], equals: numeric } }
          : null;
      }

      if (field.type === "text") {
        return { attributes: { path: [field.name], string_contains: String(value), mode: "insensitive" } };
      }

      return { attributes: { path: [field.name], equals: value } };
    };

    const conditions = values
      .map((value) => buildCondition(value))
      .filter((condition): condition is Record<string, unknown> => Boolean(condition));

    if (conditions.length === 0) {
      return [];
    }

    return conditions.length === 1 ? [conditions[0]] : [{ OR: conditions }];
  });
};

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
    mrp: Number(p.mrp),
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
    const where = buildProductWhere(orgId, filters);
    const include = buildInclude(filters?.storeId);
    const products = await prisma.product.findMany({ where, include, orderBy: { name: "asc" } });

    return products.map(toDto);
  },

  async listPaginated(orgId: string, filters?: ProductListFilters): Promise<PaginatedProductsResponse> {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize ?? 10)));
    const where = buildProductWhere(orgId, filters);
    const include = buildInclude(filters?.storeId);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products.map(toDto),
      total,
      page,
      pageSize,
    };
  },

  async listPaginatedWithAttributes(
    orgId: string,
    filters?: ProductQueryFilters
  ): Promise<PaginatedProductsResponse> {
    const page = Math.max(1, Number(filters?.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize ?? 20)));
    const where = buildProductWhere(orgId, filters);
    const include = buildInclude(filters?.storeId);

    if (filters?.categoryId && filters?.categoryAttributeSchema && filters?.attributeFilters) {
      const attributeConditions = buildAttributeConditions(
        filters.categoryAttributeSchema,
        filters.attributeFilters
      );
      if (attributeConditions.length > 0) {
        where.AND = [...(where.AND ?? []), ...attributeConditions];
      }
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products.map(toDto),
      total,
      page,
      pageSize,
    };
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
    if (!barcode || !barcode.trim()) return null;

    const cleanBarcode = barcode.trim().toUpperCase();

    // Tier 1: match product SKU or external barcode (case-insensitive)
    const bySkuOrBarcode = await prisma.product.findFirst({
      where: {
        orgId,
        OR: [
          { sku: { equals: cleanBarcode, mode: "insensitive" } },
          { externalBarcode: { equals: cleanBarcode, mode: "insensitive" } },
        ],
      },
      include: buildInclude(),
    });
    if (bySkuOrBarcode) return toDto(bySkuOrBarcode);

    // Tier 2: match a size-level variant SKU (EAN-13 or variant barcode)
    const stockEntry = await prisma.stockEntry.findFirst({
      where: {
        variantSku: { equals: cleanBarcode, mode: "insensitive" },
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
          mrp: values.mrp,
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
          ...(values.mrp !== undefined && { mrp: values.mrp }),
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

  // ─── Bulk Upload ──────────────────────────────────────────────────────────

  async bulkCreate(
    rows: BulkProductValidated[],
    orgId: string,
    storeId?: string
  ): Promise<BulkUploadResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Resolve default storeId if not provided
      let resolvedStoreId = storeId ?? null;
      if (!resolvedStoreId) {
        const org = await tx.organization.findUnique({
          where: { id: orgId },
          include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } },
        });
        resolvedStoreId = org?.stores[0]?.id ?? null;
      }

      // 2. Build category and brand lookup maps
      const [allCategories, allBrands] = await Promise.all([
        tx.category.findMany({
          where: { orgId },
          select: { id: true, name: true },
        }),
        tx.brand.findMany({
          where: { orgId },
          select: { id: true, name: true },
        }),
      ]);

      const categoryMap = new Map(
        allCategories.map((c) => [normalizeNameKey(c.name), c.id])
      );
      const brandMap = new Map(
        allBrands.map((b) => [normalizeNameKey(b.name), b.id])
      );

      // 3. Validate all rows before writing anything
      const errors: Array<{ row: number; identifier: string; message: string }> = [];
      for (const [i, row] of rows.entries()) {
        const rowNum = i + 1;
        if (!brandMap.has(normalizeNameKey(row.brandName))) {
          errors.push({ row: rowNum, identifier: row.name, message: `Brand "${row.brandName}" not found (row ${rowNum})` });
        }
        if (!categoryMap.has(normalizeNameKey(row.categoryName))) {
          errors.push({ row: rowNum, identifier: row.name, message: `Category "${row.categoryName}" not found (row ${rowNum})` });
        }
      }
      if (errors.length > 0) return { success: false, errors };

      // 4. Pre-check SKU uniqueness for non-blank SKUs
      const existingProducts = await tx.product.findMany({
        where: { orgId },
        select: { sku: true },
      });
      const existingSkus = new Set(existingProducts.map((p) => normalizeSku(p.sku)));

      // Detect non-blank SKU conflicts in DB and within the batch
      const seenSkusInBatch = new Set<string>();
      // Also auto-generate counters per brand+category prefix
      const autoGenCounters = new Map<string, number>();

      const resolvedRows = rows.map((row, i) => {
        const rowNum = i + 1;
        const categoryId = categoryMap.get(normalizeNameKey(row.categoryName))!;
        const brandId = brandMap.get(normalizeNameKey(row.brandName))!;

        let sku = row.sku ? normalizeSku(row.sku) : "";

        if (sku) {
          // Explicit SKU — check uniqueness
          if (existingSkus.has(sku)) {
            errors.push({ row: rowNum, identifier: row.name, message: `SKU "${sku}" already exists (row ${rowNum})` });
          } else if (seenSkusInBatch.has(sku)) {
            errors.push({ row: rowNum, identifier: row.name, message: `Duplicate SKU "${sku}" within batch (row ${rowNum})` });
          } else {
            seenSkusInBatch.add(sku);
            existingSkus.add(sku); // prevent later rows from reusing it
          }
        } else {
          // Auto-generate: {BRAND_PREFIX}-{CAT_PREFIX}-{seq}
          const bPrefix = row.brandName.trim().replace(/\s+/g, "").toUpperCase().slice(0, 3);
          const cPrefix = row.categoryName.trim().replace(/\s+/g, "").toUpperCase().slice(0, 3);
          const prefix = `${bPrefix}-${cPrefix}`;
          const counter = (autoGenCounters.get(prefix) ?? 0) + 1;
          autoGenCounters.set(prefix, counter);
          let candidate = `${prefix}-${String(counter).padStart(3, "0")}`;
          // Ensure uniqueness across DB + batch
          let attempt = counter;
          while (existingSkus.has(candidate) || seenSkusInBatch.has(candidate)) {
            attempt++;
            candidate = `${prefix}-${String(attempt).padStart(3, "0")}`;
          }
          sku = candidate;
          seenSkusInBatch.add(sku);
          existingSkus.add(sku);
          autoGenCounters.set(prefix, attempt);
        }

        return { row, sku, brandId, categoryId };
      });

      if (errors.length > 0) return { success: false, errors };

      // 5. Insert all products in one createMany call
      await tx.product.createMany({
        data: resolvedRows.map(({ row, sku, brandId, categoryId }) => ({
          orgId,
          name: row.name,
          sku,
          externalBarcode: row.externalBarcode ?? null,
          categoryId,
          brandId,
          mrp: row.basePrice,
          basePrice: row.basePrice,
          costPrice: row.costPrice,
          attributes: (row.attributes ?? {}) as Prisma.InputJsonValue,
          imageUrl: row.imageUrl ?? null,
          isActive: true,
        })),
      });

      // 6. Re-fetch created products to get IDs
      const createdSkus = resolvedRows.map((r) => r.sku);
      const createdProducts = await tx.product.findMany({
        where: { orgId, sku: { in: createdSkus } },
        select: { id: true, sku: true },
      });
      const skuToId = new Map(createdProducts.map((p) => [p.sku, p.id]));

      // 7. Build StockEntry records (only when storeId available and sizes have quantities)
      if (resolvedStoreId) {
        const allStockData: Array<{
          productId: string;
          sizeId: string;
          storeId: string;
          quantity: number;
          reorderLevel: number;
          variantSku: string;
        }> = [];

        for (const { row, sku } of resolvedRows) {
          const productId = skuToId.get(sku);
          if (!productId || !row.sizesAndQuantities || Object.keys(row.sizesAndQuantities).length === 0) continue;

          // Resolve category sizes for this product
          const categoryId = categoryMap.get(normalizeNameKey(row.categoryName))!;
          const sizes = await tx.size.findMany({
            where: { categoryId },
            select: { id: true, label: true },
          });
          const labelToSize = new Map(sizes.map((s) => [s.label.trim().toLowerCase(), s]));

          for (const [sizeLabel, quantity] of Object.entries(row.sizesAndQuantities)) {
            if (quantity <= 0) continue;
            const size = labelToSize.get(sizeLabel.trim().toLowerCase());
            if (!size) continue; // skip unknown sizes gracefully

            allStockData.push({
              productId,
              sizeId: size.id,
              storeId: resolvedStoreId,
              quantity,
              reorderLevel: 5,
              variantSku: buildVariantSku(sku, size.label),
            });
          }
        }

        if (allStockData.length > 0) {
          await tx.stockEntry.createMany({ data: allStockData });
        }
      }

      return { success: true, imported: rows.length };
    });
  },
};
