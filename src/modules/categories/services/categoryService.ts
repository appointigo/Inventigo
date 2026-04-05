import { prisma } from "@/lib/db";
import type { Category, CategoryFormValues, AttributeField } from "../types";

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

    if (values.sizes !== undefined) {
      const currentSizes = await prisma.size.findMany({ where: { categoryId: id } });
      const currentByLabel = new Map(currentSizes.map((s) => [s.label, s]));
      const newLabelSet = new Set(values.sizes);

      // Remove sizes that are no longer in the list, but only when they have no FK references
      for (const size of currentSizes) {
        if (!newLabelSet.has(size.label)) {
          const refs = await prisma.stockEntry.count({ where: { sizeId: size.id } });
          if (refs === 0) {
            await prisma.size.delete({ where: { id: size.id } });
          }
        }
      }

      // Upsert sizes from the new list (create if new, update sortOrder if existing)
      for (let i = 0; i < values.sizes.length; i++) {
        const label = values.sizes[i];
        const match = currentByLabel.get(label);
        if (match) {
          await prisma.size.update({ where: { id: match.id }, data: { sortOrder: i } });
        } else {
          await prisma.size.create({ data: { categoryId: id, label, sortOrder: i } });
        }
      }
    }

    const c = await prisma.category.update({
      where: { id },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(values.slug !== undefined && { slug: values.slug }),
        ...(values.description !== undefined && { description: values.description || null }),
        ...(values.attributeSchema !== undefined && { attributeSchema: values.attributeSchema }),
      },
      include: buildInclude(),
    });
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
};
