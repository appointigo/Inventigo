export type ProductFormValues = {
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  basePrice: number;
  costPrice: number;
  attributes: Record<string, unknown>;
  imageUrl?: string;
  isActive: boolean;
  sizes: string[]; // size IDs from the selected category
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
  quantity: number;
  reorderLevel: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
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
