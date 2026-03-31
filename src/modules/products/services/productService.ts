import type { Product, ProductFormValues, ProductListFilters } from "../types";
import { getOrgData } from "@/lib/mock-org-store";

// TODO: Replace with Prisma queries when DB is connected

export const productService = {
  async list(orgId: string, filters?: ProductListFilters): Promise<Product[]> {
    const { products } = getOrgData(orgId);
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

  async getById(orgId: string, id: string): Promise<Product | null> {
    const { products } = getOrgData(orgId);
    return products.find((p) => p.id === id) ?? null;
  },

  async getBySku(orgId: string, sku: string): Promise<Product | null> {
    const { products } = getOrgData(orgId);
    return products.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) ?? null;
  },

  async getByBarcode(orgId: string, barcode: string): Promise<Product | null> {
    const { products } = getOrgData(orgId);
    const lower = barcode.toLowerCase();
    return (
      products.find((p) => p.sku.toLowerCase() === lower) ??
      products.find((p) => p.externalBarcode?.toLowerCase() === lower) ??
      products.find((p) => p.stock.some((s) => s.variantSku?.toLowerCase() === lower)) ??
      null
    );
  },

  async create(orgId: string, values: ProductFormValues): Promise<Product> {
    const data = getOrgData(orgId);
    const now = new Date().toISOString();
    const id = `prod-${data.productNextId++}`;
    const catRef = data.products.find((p) => p.categoryId === values.categoryId);
    const brandRef = data.products.find((p) => p.brandId === values.brandId);
    const newProduct: Product = {
      id,
      name: values.name,
      sku: values.sku,
      externalBarcode: values.externalBarcode ?? null,
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
    data.products.push(newProduct);
    return newProduct;
  },

  async update(orgId: string, id: string, values: Partial<ProductFormValues>): Promise<Product | null> {
    const data = getOrgData(orgId);
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const existing = data.products[idx];
    const updated: Product = {
      ...existing,
      name: values.name ?? existing.name,
      sku: values.sku ?? existing.sku,
      externalBarcode: values.externalBarcode !== undefined ? (values.externalBarcode ?? null) : existing.externalBarcode,
      categoryId: values.categoryId ?? existing.categoryId,
      brandId: values.brandId ?? existing.brandId,
      basePrice: values.basePrice ?? existing.basePrice,
      costPrice: values.costPrice ?? existing.costPrice,
      attributes: values.attributes ?? existing.attributes,
      imageUrl: values.imageUrl !== undefined ? (values.imageUrl ?? null) : existing.imageUrl,
      isActive: values.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    data.products[idx] = updated;
    return updated;
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const data = getOrgData(orgId);
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    data.products.splice(idx, 1);
    return true;
  },
};
