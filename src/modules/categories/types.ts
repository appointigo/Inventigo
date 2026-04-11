// ─── Bulk Upload ─────────────────────────────────────────────────────────────

/** Raw row as parsed from CSV / Excel. */
export type BulkCategoryRow = {
  name: string;
  description: string;
  sizes: string; // "S,M,L,XL"
  // attr_1_name ... attr_10_name
  // attr_1_type ... attr_10_type
  // attr_1_values ... attr_10_values
  // attr_1_required ... attr_10_required
  [key: string]: string;
};

export type BulkAttributeField = {
  key: string;          // auto-derived: name.toLowerCase().replace(/ /g, '_')
  name: string;         // original name from template — matches AttributeField.name
  type: "text" | "select"; // template uses "dropdown", stored as "select"
  options: string[];    // empty array for type=text
  required: boolean;
};

/** Validated row ready to send to the server. */
export type BulkCategoryValidated = {
  name: string;
  description: string | null;
  sizes: string[];
  attributeSchema: { fields: BulkAttributeField[] };
};

/** A single row-level error. */
export type BulkUploadRowError = {
  row: number;
  identifier: string;
  message: string;
};

/** Result from POST /api/categories/bulk. */
export type BulkUploadResult =
  | { success: true; imported: number }
  | { success: false; errors: BulkUploadRowError[] };

// ─── Single-entity forms ──────────────────────────────────────────────────────

export type AttributeField = {
  name: string;
  type: "text" | "select" | "number";
  options?: string[];
  required: boolean;
};

export type CategoryFormValues = {
  name: string;
  slug: string;
  description?: string;
  attributeSchema: {
    fields: AttributeField[];
  };
  sizes: string[];
  storeId?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  attributeSchema: { fields: AttributeField[] };
  sizes: { id: string; label: string; sortOrder: number }[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
