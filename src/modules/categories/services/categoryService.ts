import { Category, CategoryFormValues } from "../types";
import { getOrgData } from "@/lib/mock-org-store";

// TODO: Replace with Prisma queries when DB is connected

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const categoryService = {
  async list(orgId: string): Promise<Category[]> {
    const { categories } = getOrgData(orgId);
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(orgId: string, id: string): Promise<Category | null> {
    const { categories } = getOrgData(orgId);
    return categories.find((c) => c.id === id) ?? null;
  },

  async create(orgId: string, values: CategoryFormValues): Promise<Category> {
    const data = getOrgData(orgId);
    const now = new Date().toISOString();
    const id = `cat-${data.categoryNextId++}`;
    const newCategory: Category = {
      id,
      name: values.name,
      slug: values.slug || generateSlug(values.name),
      description: values.description ?? null,
      attributeSchema: values.attributeSchema ?? { fields: [] },
      sizes: values.sizes.map((label, i) => ({
        id: `s-${Date.now()}-${i}`,
        label,
        sortOrder: i,
      })),
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.categories.push(newCategory);
    return newCategory;
  },

  async update(orgId: string, id: string, values: Partial<CategoryFormValues>): Promise<Category | null> {
    const data = getOrgData(orgId);
    const idx = data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const existing = data.categories[idx];
    const updated: Category = {
      ...existing,
      name: values.name ?? existing.name,
      slug: values.slug ?? existing.slug,
      description: values.description !== undefined ? (values.description ?? null) : existing.description,
      attributeSchema: values.attributeSchema ?? existing.attributeSchema,
      sizes: values.sizes
        ? values.sizes.map((label, i) => {
            const existingSize = existing.sizes.find((s) => s.label === label);
            return existingSize
              ? { ...existingSize, sortOrder: i }
              : { id: `s-${Date.now()}-${i}`, label, sortOrder: i };
          })
        : existing.sizes,
      updatedAt: new Date().toISOString(),
    };
    data.categories[idx] = updated;
    return updated;
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const data = getOrgData(orgId);
    const idx = data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    if (data.categories[idx].productCount > 0) {
      throw new Error("Cannot delete category with existing products");
    }
    data.categories.splice(idx, 1);
    return true;
  },
};
