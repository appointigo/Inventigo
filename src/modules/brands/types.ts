// ─── Bulk Upload ─────────────────────────────────────────────────────────────

/** Raw row as parsed from CSV / Excel (all string values). */
export type BulkBrandRow = {
  name: string;
  logo_url: string;
  is_active: string;
  [key: string]: string;
};

/** Validated row ready to send to the server. */
export type BulkBrandValidated = {
  name: string;
  logoUrl: string | null;
  isActive: boolean;
};

/** A single row-level error returned by client-side validation. */
export type BulkUploadRowError = {
  /** 1-based row number matching the CSV/Excel row (excluding header). */
  row: number;
  /** Identifier for the row — brand name, category name, or SKU. */
  identifier: string;
  /** Human-readable reason. */
  message: string;
};

/** Structured result returned by POST /api/brands/bulk. */
export type BulkUploadResult =
  | { success: true; imported: number }
  | { success: false; errors: BulkUploadRowError[] };

// ─── Single-entity forms ──────────────────────────────────────────────────────

export type BrandFormValues = {
  name: string;
  logoUrl?: string;
  isActive: boolean;
  storeId?: string;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
