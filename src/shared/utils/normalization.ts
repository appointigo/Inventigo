/**
 * Shared normalization utilities for Bulk Upload.
 * Used in both client-side validation (Step 3 Preview) and server-side validation (Step 4 Import).
 * Original casing is always preserved in the database — normalization is ONLY for comparison.
 */

/** Normalize brand names and attribute names: trim + lowercase. */
export const normalizeNameKey = (v: string): string => v.trim().toLowerCase();

/**
 * Normalize category names for uniqueness checks.
 * Strips all spaces, hyphens, and underscores before lowercasing.
 * T-Shirts = t_shirts = TSHIRTS = T Shirts → all resolve to "tshirts"
 */
export const normalizeCategoryName = (v: string): string =>
  v.trim().toLowerCase().replace(/[\s\-_]+/g, "");

/** Normalize SKUs: trim + uppercase. NK-ts-001 = NK-TS-001 */
export const normalizeSku = (v: string): string => v.trim().toUpperCase();

/** Generate a URL-safe slug from any string. Consistent with categoryService.generateSlug. */
export const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
