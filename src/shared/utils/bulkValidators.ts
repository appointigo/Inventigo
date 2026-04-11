/**
 * Client-side (browser) validators for Bulk Upload Step 3 Preview.
 * Runs after fileParser.ts returns rows; before any server call.
 * Returns an array of errors — one per invalid row.
 */

import { normalizeNameKey, normalizeCategoryName, normalizeSku } from "./normalization";
import type { BulkBrandRow, BulkBrandValidated } from "@/modules/brands/types";
import type {BulkCategoryRow,BulkCategoryValidated,BulkAttributeField} from "@/modules/categories/types";
import type {BulkProductRow,BulkProductValidated} from "@/modules/products/types";

export type RowValidationError = {
  row: number;        // 1-based
  identifier: string; // name / sku / identifies the row for the user
  message: string;
};

export type ValidationResult<T> = {
  validated: T[];
  errors: RowValidationError[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isValidUrl = (v: string): boolean => {
  return /^https?:\/\/.+/.test(v.trim());
};

const isPositiveNumber = (v: string): boolean => {
  const n = parseFloat(v);
  return !isNaN(n) && n > 0;
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export const validateBrandRows = ( rows: BulkBrandRow[] ): ValidationResult<BulkBrandValidated> => {
  const validated: BulkBrandValidated[] = [];
  const errors: RowValidationError[] = [];
  const seenNames = new Map<string, number>(); // normalizedName → first row number

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 1;
    const name = row.name?.trim() ?? "";
    const rowErrors: string[] = [];

    if (!name) {
      rowErrors.push("Brand name is required");
    } else {
      const norm = normalizeNameKey(name);
      const prev = seenNames.get(norm);
      if (prev !== undefined) {
        rowErrors.push(`Brand with same name already exists (row ${prev})`);
      } else {
        seenNames.set(norm, rowNum);
      }
    }

    const logoUrl = row.logo_url?.trim() ?? "";
    if (logoUrl && !isValidUrl(logoUrl)) {
      rowErrors.push("Invalid logo URL format — must start with http:// or https://");
    }

    const isActiveRaw = row.is_active?.trim().toLowerCase() ?? "";
    if (isActiveRaw && isActiveRaw !== "yes" && isActiveRaw !== "no") {
      rowErrors.push("is_active must be 'yes' or 'no'");
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, identifier: name || `Row ${rowNum}`, message: rowErrors[0] });
    } else {
      validated.push({
        name,
        logoUrl: logoUrl || null,
        isActive: isActiveRaw !== "no",
      });
    }
  }

  return { validated, errors };
}

// ─── Categories ───────────────────────────────────────────────────────────────

const ATTR_COUNT = 10;

const buildAttributeSchema = ( row: BulkCategoryRow ): BulkAttributeField[] =>{
  const fields: BulkAttributeField[] = [];
  for (let n = 1; n <= ATTR_COUNT; n++) {
    const name = row[`attr_${n}_name`]?.trim() ?? "";
    if (!name) continue; // blank name = ignore this block

    const typeRaw = (row[`attr_${n}_type`]?.trim().toLowerCase() ?? "text") as "text" | "dropdown";
    const type: "text" | "select" = typeRaw === "dropdown" ? "select" : "text";
    const valuesRaw = row[`attr_${n}_values`]?.trim() ?? "";
    const options = type === "select" && valuesRaw
      ? valuesRaw.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
    const required = (row[`attr_${n}_required`]?.trim().toLowerCase() ?? "no") === "yes";

    fields.push({
      key: name.toLowerCase().replace(/\s+/g, "_"),
      name,
      type,
      options,
      required,
    });
  }
  return fields;
}

export const validateCategoryRows = ( rows: BulkCategoryRow[] ): ValidationResult<BulkCategoryValidated> => {
  const validated: BulkCategoryValidated[] = [];
  const errors: RowValidationError[] = [];
  const seenNames = new Map<string, number>();

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 1;
    const name = row.name?.trim() ?? "";
    const rowErrors: string[] = [];

    if (!name) {
      rowErrors.push("Category name is required");
    } 
    else {
      const norm = normalizeCategoryName(name);
      const prev = seenNames.get(norm);
      if (prev !== undefined) {
        rowErrors.push(`Category with same name already exists (row ${prev})`);
      } 
      else {
        seenNames.set(norm, rowNum);
      }
    }

    // Sizes validation
    const sizesRaw = row.sizes?.trim() ?? "";
    let sizes: string[] = [];
    if (!sizesRaw) {
      rowErrors.push("At least one size is required");
    } 
    else {
      sizes = sizesRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (sizes.length === 0) {
        rowErrors.push("Invalid sizes format — use comma-separated labels");
      }
    }

    // Attribute block validation
    const attrNormNames = new Map<string, number>();
    for (let n = 1; n <= ATTR_COUNT; n++) {
      const attrName = row[`attr_${n}_name`]?.trim() ?? "";
      const attrType = row[`attr_${n}_type`]?.trim().toLowerCase() ?? "";
      const attrValues = row[`attr_${n}_values`]?.trim() ?? "";
      const attrRequired = row[`attr_${n}_required`]?.trim().toLowerCase() ?? "";

      // Name blank but other fields filled → error
      if (!attrName && (attrType || attrValues || attrRequired)) {
        rowErrors.push(`attr_${n}_name is required when other attr_${n} fields are filled`);
        continue;
      }
      if (!attrName) continue; // fully blank block — ignore

      // Duplicate attribute name check
      const normAttrName = normalizeNameKey(attrName);
      const prevAttr = attrNormNames.get(normAttrName);
      if (prevAttr !== undefined) {
        rowErrors.push(`Duplicate attribute name '${attrName}' in this row`);
      } 
      else {
        attrNormNames.set(normAttrName, n);
      }

      if (attrType && attrType !== "text" && attrType !== "dropdown") {
        rowErrors.push(`attr_${n}_type must be 'text' or 'dropdown'`);
      }
      if (attrType === "dropdown" && !attrValues) {
        rowErrors.push(`attr_${n}: Dropdown attribute requires at least one value`);
      }
      if (attrRequired && attrRequired !== "yes" && attrRequired !== "no") {
        rowErrors.push(`attr_${n}_required must be 'yes' or 'no'`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, identifier: name || `Row ${rowNum}`, message: rowErrors[0] });
    } 
    else {
      const attributeSchema = {
        fields: buildAttributeSchema(row),
      };
      validated.push({
        name,
        description: row.description?.trim() || null,
        sizes,
        attributeSchema,
      });
    }
  }

  return { validated, errors };
}

// ─── Products ────────────────────────────────────────────────────────────────

// Standard product column keys — anything else is treated as an attribute column
const STANDARD_PRODUCT_KEYS = new Set([
  "brand_name", "category_name", "sku", "name",
  "base_price", "cost_price", "sizes_and_quantities",
  "external_barcode", "image_url", "attributes",
]);

const parseSizesAndQuantities = (raw: string): { parsed: Record<string, number>; error: string | null } => {
  if (!raw.trim()) return { parsed: {}, error: null };

  const result: Record<string, number> = {};
  const pairs = raw.split(/[,;]/); // accept both comma and semicolon separators

  for (const pair of pairs) {
    const [label, qtyStr] = pair.trim().split(":");
    if (!label || qtyStr === undefined) {
      return { parsed: {}, error: "Invalid format — use 'S:10,M:20' or 'S:10;M:20' notation" };
    }
    const qty = parseInt(qtyStr.trim(), 10);
    if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return { parsed: {}, error: "Quantity must be a whole number ≥ 0" };
    }
    result[label.trim()] = qty;
  }

  return { parsed: result, error: null };
}

const parseAttributes = (raw: string): Record<string, string> => {
  if (!raw.trim()) return {};
  const result: Record<string, string> = {};
  for (const pair of raw.split(";")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

export const validateProductRows = ( rows: BulkProductRow[] ): ValidationResult<BulkProductValidated> => {
  const validated: BulkProductValidated[] = [];
  const errors: RowValidationError[] = [];
  const seenSkus = new Map<string, number>();

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 1;
    const name = row.name?.trim() ?? "";
    const brandName = row.brand_name?.trim() ?? "";
    const categoryName = row.category_name?.trim() ?? "";
    const skuRaw = row.sku?.trim() ?? "";
    const rowErrors: string[] = [];

    if (!brandName) rowErrors.push("Brand is required");
    if (!categoryName) rowErrors.push("Category is required");
    if (!name) rowErrors.push("Product name is required");

    const basePriceRaw = row.base_price?.toString().trim() ?? "";
    const costPriceRaw = row.cost_price?.toString().trim() ?? "";

    if (!isPositiveNumber(basePriceRaw)) {
      rowErrors.push("Base price must be a number greater than 0");
    }
    if (!isPositiveNumber(costPriceRaw)) {
      rowErrors.push("Cost price must be a number greater than 0");
    }

    // SKU — check batch-level duplicate if non-blank
    if (skuRaw) {
      const normSku_ = normalizeSku(skuRaw);
      const prevSku = seenSkus.get(normSku_);
      if (prevSku !== undefined) {
        rowErrors.push(`Duplicate SKU — same as row ${prevSku}`);
      } 
      else {
        seenSkus.set(normSku_, rowNum);
      }
    }

    // Sizes and quantities
    const { parsed: sizesAndQuantities, error: sizeError } = parseSizesAndQuantities(
      row.sizes_and_quantities ?? ""
    );
    if (sizeError) rowErrors.push(sizeError);

    // Image URL
    const imageUrl = row.image_url?.trim() ?? "";
    if (imageUrl && !isValidUrl(imageUrl)) {
      rowErrors.push("Invalid image URL format — must start with http:// or https://");
    }

    // Build attributes: prefer the combined `attributes` column (CSV path); otherwise
    // compile individual attribute columns added by the Excel template (e.g. color, material).
    let combinedAttributes = row.attributes?.trim() ?? "";
    if (!combinedAttributes) {
      const extraParts: string[] = [];
      for (const [key, value] of Object.entries(row)) {
        if (!STANDARD_PRODUCT_KEYS.has(key) && value?.trim()) {
          extraParts.push(`${key}:${value.trim()}`);
        }
      }
      combinedAttributes = extraParts.join(";");
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNum,
        identifier: name || skuRaw || `Row ${rowNum}`,
        message: rowErrors[0],
      });
    } 
    else {
      validated.push({
        brandName,
        categoryName,
        sku: skuRaw ? normalizeSku(skuRaw) : "",
        name,
        basePrice: parseFloat(basePriceRaw),
        costPrice: parseFloat(costPriceRaw),
        sizesAndQuantities,
        externalBarcode: row.external_barcode?.trim() || null,
        imageUrl: imageUrl || null,
        attributes: parseAttributes(combinedAttributes),
      });
    }
  }

  return { validated, errors };
}
