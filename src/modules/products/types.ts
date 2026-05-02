// ─── Bulk Upload ─────────────────────────────────────────────────────────────

/** Raw row as parsed from CSV / Excel. */
export type BulkProductRow = {
  brand_name: string;
  category_name: string;
  sku: string;                   // optional — blank triggers auto-generation
  name: string;
  base_price: string;
  cost_price: string;
  sizes_and_quantities: string;  // "S:10,M:20,L:15" — optional
  external_barcode: string;      // optional
  image_url: string;             // optional
  attributes: string;            // "color:Blue;material:Cotton" — optional
  [key: string]: string;
};

/** Validated and coerced row ready to send to the server. */
export type BulkProductValidated = {
  brandName: string;
  categoryName: string;
  sku: string;                        // may be empty string (server auto-generates)
  name: string;
  basePrice: number;
  costPrice: number;
  sizesAndQuantities: Record<string, number>; // { S: 10, M: 20 }
  externalBarcode: string | null;
  imageUrl: string | null;
  attributes: Record<string, string>; // { color: "Blue", material: "Cotton" }
};

/** A single row-level error. */
export type BulkUploadRowError = {
  row: number;
  identifier: string;
  message: string;
};

/** Result from POST /api/products/bulk. */
export type BulkUploadResult =
  | { success: true; imported: number }
  | { success: false; errors: BulkUploadRowError[] };

// ─── Single-entity forms ──────────────────────────────────────────────────────

export type SizeQuantity = {
  sizeId: string;
  quantity: number;
  reorderLevel?: number; // per-size reorder level, defaults to 5 in DB if omitted
};

export type ProductFormValues = {
  name: string;
  sku: string;
  externalBarcode?: string;
  categoryId: string;
  brandId: string;
  mrp: number;
  basePrice: number;
  costPrice: number;
  attributes: Record<string, unknown>;
  imageUrl?: string;
  isActive: boolean;
  sizes: SizeQuantity[]; // per-size quantities
  storeId?: string; // which store to allocate this stock to
};

export type ProductListFilters = {
  storeId?: string;
  categoryId?: string;
  brandId?: string;
  sizeId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type PaginatedProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
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
  mrp: number;
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
