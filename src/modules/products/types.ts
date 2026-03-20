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
  stockEntries: {
    sizeId: string;
    quantity: number;
    reorderLevel: number;
    reorderQuantity: number;
  }[];
};

export type ProductListFilters = {
  categoryId?: string;
  brandId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
