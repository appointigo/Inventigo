import type { Product, ProductFormValues } from "../types";

const DUPLICATE_DRAFT_KEY = "products:duplicate-draft";

const appendCopySuffix = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.toLowerCase().endsWith("(copy)") ? trimmed : `${trimmed} (Copy)`;
};

export function mapProductToDuplicateDraft(product: Product): ProductFormValues {
  const attributes = JSON.parse(JSON.stringify(product.attributes ?? {})) as Record<string, unknown>;

  return {
    name: appendCopySuffix(product.name),
    sku: "",
    externalBarcode: undefined,
    categoryId: product.categoryId,
    brandId: product.brandId,
    mrp: product.mrp,
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    attributes,
    imageUrl: product.imageUrl ?? undefined,
    isActive: product.isActive,
    sizes: product.stock.map((entry) => ({
      sizeId: entry.sizeId,
      quantity: 0, // Reset quantity to 0 for new product
      reorderLevel: Number(entry.reorderLevel) || 5,
    })),
  };
}

export function saveDuplicateDraft(draft: ProductFormValues): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DUPLICATE_DRAFT_KEY, JSON.stringify(draft));
}

export function consumeDuplicateDraft(): ProductFormValues | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(DUPLICATE_DRAFT_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(DUPLICATE_DRAFT_KEY);

  try {
    const parsed = JSON.parse(raw) as ProductFormValues;
    return parsed;
  } catch {
    return null;
  }
}
