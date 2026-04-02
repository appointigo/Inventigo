export type SizeQuantity = {
  sizeId: string;
  quantity: number;
};

export type ProductFormValues = {
  name: string;
  sku: string;
  externalBarcode?: string;
  categoryId: string;
  brandId: string;
  basePrice: number;
  costPrice: number;
  attributes: Record<string, unknown>;
  imageUrl?: string;
  isActive: boolean;
  sizes: SizeQuantity[]; // per-size quantities
};

export type ProductListFilters = {
  categoryId?: string;
  brandId?: string;
  search?: string;
  isActive?: boolean;
};

export type ProductStockSize = {
  sizeId: string;
  sizeLabel: string;
  variantSku?: string | null;
  quantity: number;
  reorderLevel: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  externalBarcode: string | null;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  basePrice: number;
  costPrice: number;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  isActive: boolean;
  stock: ProductStockSize[];
  totalStock: number;
  createdAt: string;
  updatedAt: string;
};
