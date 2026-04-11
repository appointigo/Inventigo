import { prisma } from "@/lib/db";
import type { Brand, BrandFormValues, BulkBrandValidated, BulkUploadResult } from "../types";
import { normalizeNameKey } from "@/shared/utils/normalization";

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

const buildInclude = (storeId?: string) => ({
  _count: {
    select: {
      products: storeId
        ? { where: { stockEntries: { some: { storeId } } } }
        : true,
    },
  },
});

export const brandService = {
  async list(orgId: string, storeId?: string): Promise<Brand[]> {
    const brands = await prisma.brand.findMany({
      where: {
        orgId,
        // When a storeId is given: show store-specific brands for this store
        // OR org-level brands (storeId = null) shared across all stores
        ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
      },
      include: buildInclude(storeId),
      orderBy: { name: "asc" },
    });
    return brands.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<Brand | null> {
    const b = await prisma.brand.findFirst({
      where: { id, orgId },
      include: buildInclude(),
    });
    return b ? toDto(b) : null;
  },

  async create(orgId: string, values: BrandFormValues): Promise<Brand> {
    const b = await prisma.brand.create({
      data: { orgId, storeId: values.storeId ?? null, name: values.name, logoUrl: values.logoUrl ?? null, isActive: values.isActive },
      include: buildInclude(),
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
      include: buildInclude(),
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

  // ─── Bulk Upload ──────────────────────────────────────────────────────────

  async bulkCreate(
    rows: BulkBrandValidated[],
    orgId: string
  ): Promise<BulkUploadResult> {
    return prisma.$transaction(async (tx) => {
      // Pre-check: case-insensitive uniqueness against existing brands in DB
      const existing = await tx.brand.findMany({
        where: { orgId },
        select: { name: true },
      });
      const existingNormalized = new Set(existing.map((b) => normalizeNameKey(b.name)));

      // Also detect duplicates within the incoming batch itself
      const seenInBatch = new Set<string>();
      for (const [i, row] of rows.entries()) {
        const norm = normalizeNameKey(row.name);
        if (existingNormalized.has(norm)) {
          return {
            success: false,
            errors: [
              {
                row: i + 1,
                identifier: row.name,
                message: `Brand with same name already exists (row ${i + 1}: "${row.name}")`,
              },
            ],
          };
        }
        if (seenInBatch.has(norm)) {
          return {
            success: false,
            errors: [
              {
                row: i + 1,
                identifier: row.name,
                message: `Duplicate brand name within the batch (row ${i + 1}: "${row.name}")`,
              },
            ],
          };
        }
        seenInBatch.add(norm);
      }

      await tx.brand.createMany({
        data: rows.map((r) => ({
          orgId,
          name: r.name,           // stored with original casing
          logoUrl: r.logoUrl,
          isActive: r.isActive,
        })),
      });

      return { success: true, imported: rows.length };
    });
  },
};
