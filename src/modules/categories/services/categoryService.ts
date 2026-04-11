import { prisma } from "@/lib/db";
import type {
  Category,
  CategoryFormValues,
  AttributeField,
  BulkCategoryValidated,
  BulkUploadResult,
} from "../types";
import { normalizeCategoryName } from "@/shared/utils/normalization";

const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type CategoryWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  attributeSchema: unknown;
  createdAt: Date;
  updatedAt: Date;
  sizes: { id: string; label: string; sortOrder: number }[];
  _count: { products: number };
};

const toDto = (c: CategoryWithRelations): Category => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  description: c.description,
  attributeSchema: (c.attributeSchema as { fields: AttributeField[] }) ?? { fields: [] },
  sizes: [...c.sizes].sort((a, b) => a.sortOrder - b.sortOrder),
  productCount: c._count.products,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

const buildInclude = (storeId?: string) => ({
  sizes: { orderBy: { sortOrder: "asc" as const } },
  _count: {
    select: {
      products: storeId
        ? { where: { stockEntries: { some: { storeId } } } }
        : true,
    },
  },
});

export const categoryService = {
  async list(orgId: string, storeId?: string): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      where: {
        orgId,
        // When a storeId is given: show store-specific categories for this store
        // OR org-level categories (storeId = null) that are shared across all stores
        ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
      },
      include: buildInclude(storeId),
      orderBy: { name: "asc" },
    });
    return categories.map(toDto);
  },

  async getById(orgId: string, id: string): Promise<Category | null> {
    const c = await prisma.category.findFirst({ where: { id, orgId }, include: buildInclude() });
    return c ? toDto(c) : null;
  },

  async create(orgId: string, values: CategoryFormValues): Promise<Category> {
    const c = await prisma.category.create({
      data: {
        orgId,
        storeId: values.storeId ?? null,
        name: values.name,
        slug: values.slug || generateSlug(values.name),
        description: values.description ?? null,
        attributeSchema: values.attributeSchema ?? { fields: [] },
        sizes: {
          create: values.sizes.map((label, i) => ({ label, sortOrder: i })),
        },
      },
      include: buildInclude(),
    });
    return toDto(c);
  },

  async update(orgId: string, id: string, values: Partial<CategoryFormValues>): Promise<Category | null> {
    const existing = await prisma.category.findFirst({ where: { id, orgId } });
    if (!existing) return null;

    await prisma.$transaction(async (tx) => {
      if (values.sizes !== undefined) {
        const currentSizes = await tx.size.findMany({ where: { categoryId: id } });
        const currentByLabel = new Map(currentSizes.map((s) => [s.label, s]));
        const newLabelSet = new Set(values.sizes);

        // Remove sizes that are no longer in the list, only if they have no FK references
        for (const size of currentSizes) {
          if (!newLabelSet.has(size.label)) {
            const refs = await tx.stockEntry.count({ where: { sizeId: size.id } });
            if (refs === 0) {
              await tx.size.delete({ where: { id: size.id } });
            }
          }
        }

        // Upsert sizes: update sortOrder if existing, create if new
        for (let i = 0; i < values.sizes.length; i++) {
          const label = values.sizes[i];
          const match = currentByLabel.get(label);
          if (match) {
            await tx.size.update({ where: { id: match.id }, data: { sortOrder: i } });
          } else {
            await tx.size.create({ data: { categoryId: id, label, sortOrder: i } });
          }
        }
      }

      await tx.category.update({
        where: { id },
        data: {
          ...(values.name !== undefined && { name: values.name }),
          ...(values.slug !== undefined && { slug: values.slug }),
          ...(values.description !== undefined && { description: values.description || null }),
          ...(values.attributeSchema !== undefined && { attributeSchema: values.attributeSchema }),
        },
      });
    });

    const c = await prisma.category.findUniqueOrThrow({ where: { id }, include: buildInclude() });
    return toDto(c);
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const c = await prisma.category.findFirst({
      where: { id, orgId },
      include: { _count: { select: { products: true } } },
    });
    if (!c) return false;
    if (c._count.products > 0) throw new Error("Cannot delete category with existing products");
    await prisma.size.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });
    return true;
  },

  // ─── Bulk Upload ──────────────────────────────────────────────────────────

  async bulkCreate(
    rows: BulkCategoryValidated[],
    orgId: string
  ): Promise<BulkUploadResult> {
    return prisma.$transaction(async (tx) => {
      // Pre-check: normalized uniqueness against existing categories in DB
      const existing = await tx.category.findMany({
        where: { orgId },
        select: { name: true },
      });
      const existingNormalized = new Set(
        existing.map((c) => normalizeCategoryName(c.name))
      );

      // Detect duplicates within the batch
      const seenInBatch = new Set<string>();
      for (const [i, row] of rows.entries()) {
        const norm = normalizeCategoryName(row.name);
        if (existingNormalized.has(norm)) {
          return {
            success: false,
            errors: [
              {
                row: i + 1,
                identifier: row.name,
                message: `Category with same name already exists (row ${i + 1}: "${row.name}")`,
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
                message: `Duplicate category name within the batch (row ${i + 1}: "${row.name}")`,
              },
            ],
          };
        }
        seenInBatch.add(norm);
      }

      // 1. Insert all categories in one query
      await tx.category.createMany({
        data: rows.map((r) => ({
          orgId,
          name: r.name,            // stored with original casing
          slug: generateSlug(r.name),
          description: r.description,
          attributeSchema: r.attributeSchema as object,
        })),
      });

      // 2. Re-fetch created records to get IDs (slug is unique per org)
      const slugs = rows.map((r) => generateSlug(r.name));
      const created = await tx.category.findMany({
        where: { orgId, slug: { in: slugs } },
        select: { id: true, slug: true },
      });
      const slugToId = new Map(created.map((c) => [c.slug, c.id]));

      // 3. Build all Size records across all categories and insert in one query
      const allSizes: Array<{ categoryId: string; label: string; sortOrder: number }> = [];
      for (const row of rows) {
        const categoryId = slugToId.get(generateSlug(row.name));
        if (!categoryId) continue;
        row.sizes.forEach((label, index) => {
          allSizes.push({ categoryId, label, sortOrder: index });
        });
      }

      if (allSizes.length > 0) {
        await tx.size.createMany({ data: allSizes });
      }

      return { success: true, imported: rows.length };
    });
  },
};
