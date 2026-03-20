import { Category, CategoryFormValues } from "../types";

// ─── Mock Data (matches seed.ts) ──────────────────────────────────────────────
// TODO: Replace with Prisma queries when DB is connected

let categories: Category[] = [
  {
    id: "cat-1",
    name: "T-Shirts",
    slug: "t-shirts",
    description: "Casual t-shirts for men and women",
    attributeSchema: {
      fields: [
        { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve", "Sleeveless"], required: true },
        { name: "neckType", type: "select", options: ["Round Neck", "V-Neck", "Polo", "Crew Neck"], required: true },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-1", label: "XS", sortOrder: 0 },
      { id: "s-2", label: "S", sortOrder: 1 },
      { id: "s-3", label: "M", sortOrder: 2 },
      { id: "s-4", label: "L", sortOrder: 3 },
      { id: "s-5", label: "XL", sortOrder: 4 },
      { id: "s-6", label: "XXL", sortOrder: 5 },
    ],
    productCount: 5,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Shirts",
    slug: "shirts",
    description: "Formal and casual shirts",
    attributeSchema: {
      fields: [
        { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve"], required: true },
        { name: "fit", type: "select", options: ["Slim Fit", "Regular Fit", "Relaxed Fit"], required: true },
        { name: "pattern", type: "select", options: ["Solid", "Striped", "Checked", "Printed"], required: false },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-7", label: "S", sortOrder: 0 },
      { id: "s-8", label: "M", sortOrder: 1 },
      { id: "s-9", label: "L", sortOrder: 2 },
      { id: "s-10", label: "XL", sortOrder: 3 },
      { id: "s-11", label: "XXL", sortOrder: 4 },
    ],
    productCount: 3,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-3",
    name: "Jeans",
    slug: "jeans",
    description: "Denim jeans in various fits",
    attributeSchema: {
      fields: [
        { name: "fit", type: "select", options: ["Slim", "Regular", "Relaxed", "Skinny", "Bootcut"], required: true },
        { name: "rise", type: "select", options: ["Low Rise", "Mid Rise", "High Rise"], required: false },
        { name: "wash", type: "select", options: ["Light", "Medium", "Dark", "Black"], required: true },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-12", label: "28", sortOrder: 0 },
      { id: "s-13", label: "30", sortOrder: 1 },
      { id: "s-14", label: "32", sortOrder: 2 },
      { id: "s-15", label: "34", sortOrder: 3 },
      { id: "s-16", label: "36", sortOrder: 4 },
      { id: "s-17", label: "38", sortOrder: 5 },
      { id: "s-18", label: "40", sortOrder: 6 },
    ],
    productCount: 4,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-4",
    name: "Pants",
    slug: "pants",
    description: "Formal and casual trousers",
    attributeSchema: {
      fields: [
        { name: "fit", type: "select", options: ["Slim Fit", "Regular Fit", "Tapered"], required: true },
        { name: "material", type: "select", options: ["Cotton", "Polyester", "Linen", "Blend"], required: false },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-19", label: "28", sortOrder: 0 },
      { id: "s-20", label: "30", sortOrder: 1 },
      { id: "s-21", label: "32", sortOrder: 2 },
      { id: "s-22", label: "34", sortOrder: 3 },
      { id: "s-23", label: "36", sortOrder: 4 },
      { id: "s-24", label: "38", sortOrder: 5 },
      { id: "s-25", label: "40", sortOrder: 6 },
    ],
    productCount: 2,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-5",
    name: "Dry-Fit T-Shirts",
    slug: "dry-fit-tshirts",
    description: "Moisture-wicking performance t-shirts",
    attributeSchema: {
      fields: [
        { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve", "Sleeveless"], required: true },
        { name: "sport", type: "select", options: ["Running", "Gym", "Cricket", "General"], required: false },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-26", label: "S", sortOrder: 0 },
      { id: "s-27", label: "M", sortOrder: 1 },
      { id: "s-28", label: "L", sortOrder: 2 },
      { id: "s-29", label: "XL", sortOrder: 3 },
      { id: "s-30", label: "XXL", sortOrder: 4 },
    ],
    productCount: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-6",
    name: "Lowers",
    slug: "lowers",
    description: "Track pants and joggers",
    attributeSchema: {
      fields: [
        { name: "type", type: "select", options: ["Track Pants", "Joggers", "Sweatpants"], required: true },
        { name: "material", type: "select", options: ["Cotton", "Polyester", "Fleece", "Blend"], required: false },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-31", label: "S", sortOrder: 0 },
      { id: "s-32", label: "M", sortOrder: 1 },
      { id: "s-33", label: "L", sortOrder: 2 },
      { id: "s-34", label: "XL", sortOrder: 3 },
      { id: "s-35", label: "XXL", sortOrder: 4 },
    ],
    productCount: 0,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-7",
    name: "Shorts",
    slug: "shorts",
    description: "Casual and sports shorts",
    attributeSchema: {
      fields: [
        { name: "type", type: "select", options: ["Casual", "Sports", "Cargo", "Denim"], required: true },
        { name: "length", type: "select", options: ["Above Knee", "Knee Length", "Below Knee"], required: false },
        { name: "color", type: "text", required: true },
      ],
    },
    sizes: [
      { id: "s-36", label: "S", sortOrder: 0 },
      { id: "s-37", label: "M", sortOrder: 1 },
      { id: "s-38", label: "L", sortOrder: 2 },
      { id: "s-39", label: "XL", sortOrder: 3 },
      { id: "s-40", label: "XXL", sortOrder: 4 },
    ],
    productCount: 0,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

let nextId = 8;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const categoryService = {
  async list(): Promise<Category[]> {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Category | null> {
    return categories.find((c) => c.id === id) ?? null;
  },

  async create(values: CategoryFormValues): Promise<Category> {
    const now = new Date().toISOString();
    const id = `cat-${nextId++}`;
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
    categories.push(newCategory);
    return newCategory;
  },

  async update(id: string, values: Partial<CategoryFormValues>): Promise<Category | null> {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const existing = categories[idx];
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
    categories[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    if (categories[idx].productCount > 0) {
      throw new Error("Cannot delete category with existing products");
    }
    categories.splice(idx, 1);
    return true;
  },
};
