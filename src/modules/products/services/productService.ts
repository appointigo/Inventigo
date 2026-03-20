import type { Product, ProductFormValues, ProductListFilters } from "../types";

// TODO: Replace with Prisma queries when DB is connected

let products: Product[] = [
  {
    id: "prod-1", name: "Nike Dri-FIT Running Tee", sku: "NK-DFT-001",
    categoryId: "cat-5", categoryName: "Dry-Fit T-Shirts", brandId: "br-1", brandName: "Nike",
    basePrice: 1499, costPrice: 900,
    attributes: { sleeve: "Half Sleeve", sport: "Running", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-26", sizeLabel: "S", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-27", sizeLabel: "M", quantity: 25, reorderLevel: 5 },
      { sizeId: "s-28", sizeLabel: "L", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-29", sizeLabel: "XL", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-30", sizeLabel: "XXL", quantity: 5, reorderLevel: 5 },
    ],
    totalStock: 75, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-2", name: "Adidas Classic Round Neck Tee", sku: "AD-RN-001",
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-2", brandName: "Adidas",
    basePrice: 999, costPrice: 550,
    attributes: { sleeve: "Half Sleeve", neckType: "Round Neck", color: "White" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M", quantity: 30, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L", quantity: 25, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", quantity: 8, reorderLevel: 5 },
    ],
    totalStock: 98, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-3", name: "Puma Polo T-Shirt", sku: "PM-PT-001",
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-3", brandName: "Puma",
    basePrice: 1299, costPrice: 750,
    attributes: { sleeve: "Half Sleeve", neckType: "Polo", color: "Navy Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", quantity: 5, reorderLevel: 5 },
    ],
    totalStock: 65, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-4", name: "Levi's 511 Slim Fit Jeans", sku: "LV-511-001",
    categoryId: "cat-3", categoryName: "Jeans", brandId: "br-4", brandName: "Levi's",
    basePrice: 2999, costPrice: 1800,
    attributes: { fit: "Slim", rise: "Mid Rise", wash: "Dark", color: "Indigo" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-12", sizeLabel: "28", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-13", sizeLabel: "30", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-14", sizeLabel: "32", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-15", sizeLabel: "34", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-16", sizeLabel: "36", quantity: 6, reorderLevel: 5 },
    ],
    totalStock: 61, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-5", name: "Levi's 501 Regular Fit Jeans", sku: "LV-501-001",
    categoryId: "cat-3", categoryName: "Jeans", brandId: "br-4", brandName: "Levi's",
    basePrice: 3499, costPrice: 2100,
    attributes: { fit: "Regular", rise: "Mid Rise", wash: "Medium", color: "Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-13", sizeLabel: "30", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-14", sizeLabel: "32", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-15", sizeLabel: "34", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-16", sizeLabel: "36", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-17", sizeLabel: "38", quantity: 4, reorderLevel: 5 },
    ],
    totalStock: 57, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-6", name: "Allen Solly Formal Shirt", sku: "AS-FS-001",
    categoryId: "cat-2", categoryName: "Shirts", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 1799, costPrice: 1000,
    attributes: { sleeve: "Full Sleeve", fit: "Slim Fit", pattern: "Solid", color: "Sky Blue" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-7", sizeLabel: "S", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-8", sizeLabel: "M", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-9", sizeLabel: "L", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-10", sizeLabel: "XL", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-11", sizeLabel: "XXL", quantity: 4, reorderLevel: 5 },
    ],
    totalStock: 57, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-7", name: "Allen Solly Checked Casual Shirt", sku: "AS-CS-001",
    categoryId: "cat-2", categoryName: "Shirts", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 1599, costPrice: 900,
    attributes: { sleeve: "Half Sleeve", fit: "Regular Fit", pattern: "Checked", color: "Red/White" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-7", sizeLabel: "S", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-8", sizeLabel: "M", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-9", sizeLabel: "L", quantity: 14, reorderLevel: 5 },
      { sizeId: "s-10", sizeLabel: "XL", quantity: 10, reorderLevel: 5 },
    ],
    totalStock: 54, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-8", name: "Nike Dri-FIT Joggers", sku: "NK-JG-001",
    categoryId: "cat-6", categoryName: "Lowers", brandId: "br-1", brandName: "Nike",
    basePrice: 1999, costPrice: 1200,
    attributes: { type: "Joggers", material: "Polyester", color: "Grey" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-31", sizeLabel: "S", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-32", sizeLabel: "M", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-33", sizeLabel: "L", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-34", sizeLabel: "XL", quantity: 6, reorderLevel: 5 },
    ],
    totalStock: 41, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-9", name: "Puma Cotton Track Pants", sku: "PM-TP-001",
    categoryId: "cat-6", categoryName: "Lowers", brandId: "br-3", brandName: "Puma",
    basePrice: 1499, costPrice: 850,
    attributes: { type: "Track Pants", material: "Cotton", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-31", sizeLabel: "S", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-32", sizeLabel: "M", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-33", sizeLabel: "L", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-34", sizeLabel: "XL", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-35", sizeLabel: "XXL", quantity: 5, reorderLevel: 5 },
    ],
    totalStock: 58, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-10", name: "Adidas Sport Shorts", sku: "AD-SS-001",
    categoryId: "cat-7", categoryName: "Shorts", brandId: "br-2", brandName: "Adidas",
    basePrice: 899, costPrice: 500,
    attributes: { type: "Sports", length: "Above Knee", color: "Black" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-36", sizeLabel: "S", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-37", sizeLabel: "M", quantity: 25, reorderLevel: 5 },
      { sizeId: "s-38", sizeLabel: "L", quantity: 20, reorderLevel: 5 },
      { sizeId: "s-39", sizeLabel: "XL", quantity: 10, reorderLevel: 5 },
    ],
    totalStock: 70, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-11", name: "Nike Cargo Shorts", sku: "NK-CS-001",
    categoryId: "cat-7", categoryName: "Shorts", brandId: "br-1", brandName: "Nike",
    basePrice: 1299, costPrice: 750,
    attributes: { type: "Cargo", length: "Knee Length", color: "Olive Green" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-36", sizeLabel: "S", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-37", sizeLabel: "M", quantity: 14, reorderLevel: 5 },
      { sizeId: "s-38", sizeLabel: "L", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-39", sizeLabel: "XL", quantity: 6, reorderLevel: 5 },
    ],
    totalStock: 40, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-12", name: "Puma Slim Pants", sku: "PM-SP-001",
    categoryId: "cat-4", categoryName: "Pants", brandId: "br-3", brandName: "Puma",
    basePrice: 1799, costPrice: 1050,
    attributes: { fit: "Slim Fit", material: "Cotton", color: "Khaki" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-19", sizeLabel: "28", quantity: 5, reorderLevel: 5 },
      { sizeId: "s-20", sizeLabel: "30", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-21", sizeLabel: "32", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-22", sizeLabel: "34", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-23", sizeLabel: "36", quantity: 5, reorderLevel: 5 },
    ],
    totalStock: 47, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-13", name: "Allen Solly Formal Trousers", sku: "AS-FT-001",
    categoryId: "cat-4", categoryName: "Pants", brandId: "br-5", brandName: "Allen Solly",
    basePrice: 2199, costPrice: 1300,
    attributes: { fit: "Regular Fit", material: "Polyester", color: "Charcoal" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-20", sizeLabel: "30", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-21", sizeLabel: "32", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-22", sizeLabel: "34", quantity: 14, reorderLevel: 5 },
      { sizeId: "s-23", sizeLabel: "36", quantity: 8, reorderLevel: 5 },
      { sizeId: "s-24", sizeLabel: "38", quantity: 4, reorderLevel: 5 },
    ],
    totalStock: 54, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-14", name: "Nike Pro Compression Tee", sku: "NK-PCT-001",
    categoryId: "cat-5", categoryName: "Dry-Fit T-Shirts", brandId: "br-1", brandName: "Nike",
    basePrice: 1799, costPrice: 1050,
    attributes: { sleeve: "Half Sleeve", sport: "Gym", color: "Red" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-26", sizeLabel: "S", quantity: 10, reorderLevel: 5 },
      { sizeId: "s-27", sizeLabel: "M", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-28", sizeLabel: "L", quantity: 15, reorderLevel: 5 },
      { sizeId: "s-29", sizeLabel: "XL", quantity: 8, reorderLevel: 5 },
    ],
    totalStock: 51, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "prod-15", name: "Adidas V-Neck Tee", sku: "AD-VN-001",
    categoryId: "cat-1", categoryName: "T-Shirts", brandId: "br-2", brandName: "Adidas",
    basePrice: 899, costPrice: 500,
    attributes: { sleeve: "Half Sleeve", neckType: "V-Neck", color: "Grey Melange" },
    imageUrl: null, isActive: true,
    stock: [
      { sizeId: "s-2", sizeLabel: "S", quantity: 18, reorderLevel: 5 },
      { sizeId: "s-3", sizeLabel: "M", quantity: 28, reorderLevel: 5 },
      { sizeId: "s-4", sizeLabel: "L", quantity: 22, reorderLevel: 5 },
      { sizeId: "s-5", sizeLabel: "XL", quantity: 12, reorderLevel: 5 },
      { sizeId: "s-6", sizeLabel: "XXL", quantity: 6, reorderLevel: 5 },
    ],
    totalStock: 86, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  },
];

let nextId = 16;

export const productService = {
  async list(filters?: ProductListFilters): Promise<Product[]> {
    let result = [...products];
    if (filters?.categoryId) result = result.filter((p) => p.categoryId === filters.categoryId);
    if (filters?.brandId) result = result.filter((p) => p.brandId === filters.brandId);
    if (filters?.isActive !== undefined) result = result.filter((p) => p.isActive === filters.isActive);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Product | null> {
    return products.find((p) => p.id === id) ?? null;
  },

  async create(values: ProductFormValues): Promise<Product> {
    const now = new Date().toISOString();
    const id = `prod-${nextId++}`;
    // Look up category/brand names from existing products or use IDs
    const catRef = products.find((p) => p.categoryId === values.categoryId);
    const brandRef = products.find((p) => p.brandId === values.brandId);
    const newProduct: Product = {
      id,
      name: values.name,
      sku: values.sku,
      categoryId: values.categoryId,
      categoryName: catRef?.categoryName ?? values.categoryId,
      brandId: values.brandId,
      brandName: brandRef?.brandName ?? values.brandId,
      basePrice: values.basePrice,
      costPrice: values.costPrice,
      attributes: values.attributes ?? {},
      imageUrl: values.imageUrl ?? null,
      isActive: values.isActive,
      stock: [],
      totalStock: 0,
      createdAt: now,
      updatedAt: now,
    };
    products.push(newProduct);
    return newProduct;
  },

  async update(id: string, values: Partial<ProductFormValues>): Promise<Product | null> {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const existing = products[idx];
    const updated: Product = {
      ...existing,
      name: values.name ?? existing.name,
      sku: values.sku ?? existing.sku,
      categoryId: values.categoryId ?? existing.categoryId,
      brandId: values.brandId ?? existing.brandId,
      basePrice: values.basePrice ?? existing.basePrice,
      costPrice: values.costPrice ?? existing.costPrice,
      attributes: values.attributes ?? existing.attributes,
      imageUrl: values.imageUrl !== undefined ? (values.imageUrl ?? null) : existing.imageUrl,
      isActive: values.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    products[idx] = updated;
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    products.splice(idx, 1);
    return true;
  },
};
