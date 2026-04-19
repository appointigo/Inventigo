/**
 * Color Service - Functional Approach
 * Centralized utility layer for all color operations
 *
 * Features:
 * - Type-safe color access (getColorByKey, getColorHexByName, getColorBySemantic)
 * - Efficient caching for O(1) lookups (using closures)
 * - Validation and error handling
 * - Batch operations (getAllColors, getAllColorNames)
 *
 * Philosophy: Single source of truth, fail-fast in dev, graceful in prod
 */

import type { ColorDefinition, ColorKey } from "../types/colors";
import {
  COLOR_PALETTE,
  getAllColorNames,
  getColorsByCategory,
  getColorsBySemantic,
} from "./colors";

// ─────────────────────────────────────────────────────────────────────────
// CACHE MANAGEMENT (Private - using closure)
// ─────────────────────────────────────────────────────────────────────────

const cacheStore = (() => {
  const colorCache = new Map<string, ColorDefinition>();
  const nameHexCache = new Map<string, string | null>();
  const semanticCache = new Map<string, ColorDefinition | null>();

  return {
    getColor: (key: string) => colorCache.get(key),
    setColor: (key: string, color: ColorDefinition) =>
      colorCache.set(key, color),
    hasColor: (key: string) => colorCache.has(key),

    getNameHex: (name: string) => nameHexCache.get(name),
    setNameHex: (name: string, hex: string | null) =>
      nameHexCache.set(name, hex),
    hasNameHex: (name: string) => nameHexCache.has(name),

    getSemantic: (semantic: string) => semanticCache.get(semantic),
    setSemantic: (semantic: string, color: ColorDefinition | null) =>
      semanticCache.set(semantic, color),
    hasSemantic: (semantic: string) => semanticCache.has(semantic),

    clear: () => {
      colorCache.clear();
      nameHexCache.clear();
      semanticCache.clear();
    },

    getStats: () => ({
      colorCacheSize: colorCache.size,
      nameHexCacheSize: nameHexCache.size,
      semanticCacheSize: semanticCache.size,
    }),
  };
})();

// ─────────────────────────────────────────────────────────────────────────
// PRIMARY LOOKUPS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get color definition by key
 * Throws error if not found (strict mode for development)
 *
 * @param key - Color key (e.g., "red_50", "blue_600")
 * @returns ColorDefinition
 * @throws Error if key not found
 *
 * @example
 * const color = getColorByKey("red_50");
 * console.log(color.name); // "Red"
 * console.log(color.hex);  // "#EF4444"
 */
export const getColorByKey = (key: ColorKey | string): ColorDefinition => {
  // Check cache first (O(1))
  if (cacheStore.hasColor(key)) {
    return cacheStore.getColor(key)!;
  }

  // Look up in palette
  const color = COLOR_PALETTE[key as ColorKey];

  if (!color) {
    // Provide helpful error message with suggestions
    const suggestions = Object.keys(COLOR_PALETTE)
      .filter((k) => k.toLowerCase().includes((key as string).toLowerCase()))
      .slice(0, 3);

    const message =
      suggestions.length > 0
        ? `[ColorService] Color key "${key}" not found. Did you mean: ${suggestions.join(", ")}?`
        : `[ColorService] Color key "${key}" not found.`;

    throw new Error(message);
  }

  // Cache for future lookups
  cacheStore.setColor(key, color);
  return color;
}

/**
 * Get hex value by color name
 * Case-insensitive, supports aliases
 *
 * @param name - Color name (e.g., "Red", "red", "danger")
 * @returns Hex value or null if not found
 *
 * @example
 * getColorHexByName("Red");       // "#EF4444"
 * getColorHexByName("red");       // "#EF4444" (case-insensitive)
 * getColorHexByName("danger");    // "#EF4444" (alias)
 * getColorHexByName("Unknown");   // null
 */
export const getColorHexByName = (name: string): string | null => {
  if (!name) return null;

  const normalized = name.toLowerCase();

  // Check cache first
  if (cacheStore.hasNameHex(normalized)) {
    return cacheStore.getNameHex(normalized) ?? null;
  }

  // Search through palette
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.name.toLowerCase() === normalized) {
      cacheStore.setNameHex(normalized, color.hex);
      return color.hex;
    }

    // Check aliases
    if (color.aliases) {
      for (const alias of color.aliases) {
        if (alias.toLowerCase() === normalized) {
          cacheStore.setNameHex(normalized, color.hex);
          return color.hex;
        }
      }
    }
  }

  // Not found - cache the null result to avoid repeated searches
  cacheStore.setNameHex(normalized, null);
  return null;
}

/**
 * Get color definition by semantic meaning
 * First match wins (semantic values should be unique)
 *
 * @param semantic - Semantic meaning (e.g., "error", "success", "warning")
 * @returns ColorDefinition or null if not found
 *
 * @example
 * const errorColor = getColorBySemantic("error");
 * // { name: "Red", hex: "#EF4444", semantic: "error", ... }
 */
export const getColorBySemantic = ( semantic: string ): ColorDefinition | null => {
  if (!semantic) return null;

  // Check cache first
  if (cacheStore.hasSemantic(semantic)) {
    return cacheStore.getSemantic(semantic) ?? null;
  }

  // Search through palette
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.semantic === semantic) {
      cacheStore.setSemantic(semantic, color);
      return color;
    }
  }

  // Not found - cache the null result
  cacheStore.setSemantic(semantic, null);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// BATCH OPERATIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get all colors in the palette
 * Useful for dropdowns, galleries, etc.
 *
 * @returns Array of all color definitions
 *
 * @example
 * const allColors = getAllColors();
 * const options = allColors.map(c => ({ label: c.name, value: c.hex }));
 */
export const getAllColors = (): Array<ColorDefinition> => {
  return Object.values(COLOR_PALETTE);
};

/**
 * Get all color names (sorted)
 * Useful for dropdown lists
 *
 * @returns Array of color names sorted alphabetically
 *
 * @example
 * const names = getAllColorNames();
 * // ["Amber", "Black", "Blue", "Brown", ...]
 */
export { getAllColorNames } from "./colors";

/**
 * Get colors by category
 * Returns all colors in a specific category, sorted by name
 *
 * @param category - Category (e.g., "primary", "accent", "neutral", "product")
 * @returns Array of colors in that category, sorted by name
 *
 * @example
 * const primaryColors = getColorsByCategory("primary");
 * // [Red, Orange, Green, Blue, ...]
 */
export const getColorsByCategoryWrapped = ( category: string ): Array<ColorDefinition> => {
  return getColorsByCategory(category).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Get colors by semantic meaning
 * Returns all colors with a specific semantic, sorted by name
 *
 * @param semantic - Semantic meaning
 * @returns Array of colors with that semantic
 *
 * @example
 * const errorColors = getColorsBySemantics("error");
 * // [Red, Dark Red, ...]
 */
export const getColorsBySemantics = ( semantic: string ): Array<ColorDefinition> => {
  return getColorsBySemantic(semantic).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Get unique semantic values in use
 *
 * @returns Array of unique semantic values
 *
 * @example
 * const semantics = getAllSemantics();
 * // ["error", "warning", "success", "info", ...]
 */
export const getAllSemantics = (): string[] => {
  const semantics = new Set<string>();
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.semantic) {
      semantics.add(color.semantic);
    }
  }
  return Array.from(semantics).sort();
}

/**
 * Get unique categories in use
 *
 * @returns Array of unique categories
 *
 * @example
 * const categories = getAllCategories();
 * // ["primary", "accent", "neutral", "product", "semantic"]
 */
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.category) {
      categories.add(color.category);
    }
  }
  return Array.from(categories).sort();
}

// ─────────────────────────────────────────────────────────────────────────
// VALIDATION & UTILITY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if a string is a valid hex color
 * Supports: #RGB, #RRGGBB, #RRGGBBAA
 *
 * @param hex - Hex string to validate
 * @returns true if valid hex format
 *
 * @example
 * isValidHex("#EF4444");    // true
 * isValidHex("#EF4");       // true
 * isValidHex("EF4444");     // false
 * isValidHex("#GGGGGG");    // false
 */
export const isValidHex = (hex: string): boolean => {
  if (!hex || typeof hex !== "string") return false;
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(hex);
};

/**
 * Normalize color input (hex, name, or key)
 * Returns hex if valid, null otherwise
 *
 * @param input - Can be hex, color name, or color key
 * @returns Normalized hex or null
 *
 * @example
 * normalizeColor("#EF4444");  // "#EF4444"
 * normalizeColor("Red");      // "#EF4444"
 * normalizeColor("red_50");   // "#EF4444"
 * normalizeColor("invalid");  // null
 */
export const normalizeColor = (input: string): string | null => {
  if (!input) return null;

  // If it's already a valid hex, return it
  if (isValidHex(input)) {
    return input.toUpperCase();
  }

  // Try to get it by name
  const byName = getColorHexByName(input);
  if (byName) return byName.toUpperCase();

  // Try to get it by key
  try {
    const byKey = getColorByKey(input as ColorKey);
    return byKey.hex.toUpperCase();
  } 
  catch {
    // Not found
    return null;
  }
}

/**
 * Find color name by hex (reverse lookup)
 * Returns first match or null
 *
 * @param hex - Hex color code
 * @returns Color name or null if not found
 *
 * @example
 * findColorNameByHex("#EF4444"); // "Red"
 * findColorNameByHex("#FF0000"); // null
 */
export const findColorNameByHex = (hex: string): string | null => {
  if (!isValidHex(hex)) return null;

  const normalized = hex.toUpperCase();

  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.hex.toUpperCase() === normalized) {
      return color.name;
    }
  }

  return null;
}

/**
 * Check if color exists (by name or key)
 *
 * @param nameOrKey - Color name or key
 * @returns true if color exists
 *
 * @example
 * colorExists("Red");      // true
 * colorExists("red_50");   // true
 * colorExists("invalid");  // false
 */
export const colorExists = (nameOrKey: string): boolean => {
  const byName = getColorHexByName(nameOrKey);
  if (byName) return true;

  try {
    getColorByKey(nameOrKey as ColorKey);
    return true;
  } 
  catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CACHE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

/**
 * Clear all caches (useful for testing)
 * Not needed in production
 *
 * @example
 * clearColorCache();
 */
export const clearColorCache = (): void => {
  cacheStore.clear();
}

/**
 * Get cache statistics (for debugging)
 *
 * @returns Cache statistics
 *
 * @example
 * const stats = getColorCacheStats();
 * console.log(stats); // { colorCacheSize: 5, nameHexCacheSize: 10, ... }
 */
export const getColorCacheStats = (): {
  colorCacheSize: number;
  nameHexCacheSize: number;
  semanticCacheSize: number;
} => {
  return cacheStore.getStats();
}

// ─────────────────────────────────────────────────────────────────────────
// LIGHTWEIGHT HELPER FUNCTIONS (for hot paths)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lightweight hex lookup
 * Use this in tight loops or frequent renders
 * Returns hex or fallback gray
 *
 * @param nameOrKey - Color name or key
 * @param fallback - Fallback hex value (default: "#999999")
 * @returns Hex value
 *
 * @example
 * getColorHex("Red");        // "#EF4444"
 * getColorHex("invalid");    // "#999999" (fallback)
 * getColorHex("invalid", "#000000"); // "#000000" (custom fallback)
 */
export const getColorHex = (nameOrKey: string, fallback = "#999999"): string => {
  const hex = getColorHexByName(nameOrKey);
  if (hex) return hex;

  try {
    return getColorByKey(nameOrKey as ColorKey).hex;
  } 
  catch {
    return fallback;
  }
}

/**
 * Lightweight name lookup
 * Returns name or null
 *
 * @param hex - Hex color code
 * @returns Color name or null
 *
 * @example
 * getColorName("#EF4444"); // "Red"
 * getColorName("#FF0000"); // null
 */
export const getColorName = (hex: string): string | null => {
  return findColorNameByHex(hex);
}

// ─────────────────────────────────────────────────────────────────────────
// DROPDOWN & SELECTION OPTIONS (Component Integration)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get color options for product/variant color dropdown
 * Includes all product-specific colors organized by type
 * Used in ProductForm for T-shirt color selection, etc.
 *
 * @returns Array of color options with key, name, hex, and value
 *
 * @example
 * const options = getProductColorOptions();
 * // [
 * //   { key: "red", name: "Red", hex: "#E53E3E", value: "red" },
 * //   { key: "blue", name: "Blue", hex: "#4299E1", value: "blue" },
 * //   ...
 * // ]
 */
export const getProductColorOptions = () => {
  return [
    { key: "red", name: "Red", hex: COLOR_PALETTE.product_red.hex, value: "red" },
    { key: "darkRed", name: "Dark Red", hex: COLOR_PALETTE.red_600.hex, value: "darkRed" },
    { key: "blue", name: "Blue", hex: COLOR_PALETTE.product_blue.hex, value: "blue" },
    { key: "darkBlue", name: "Dark Blue", hex: COLOR_PALETTE.blue_600.hex, value: "darkBlue" },
    { key: "black", name: "Black", hex: COLOR_PALETTE.product_black.hex, value: "black" },
    { key: "white", name: "White", hex: COLOR_PALETTE.product_white_off.hex, value: "white" },
    { key: "navy", name: "Navy", hex: COLOR_PALETTE.product_navy.hex, value: "navy" },
    { key: "green", name: "Green", hex: COLOR_PALETTE.product_green.hex, value: "green" },
    { key: "gray", name: "Gray", hex: COLOR_PALETTE.product_gray.hex, value: "gray" },
    { key: "brown", name: "Brown", hex: COLOR_PALETTE.product_brown.hex, value: "brown" },
    { key: "pink", name: "Pink", hex: COLOR_PALETTE.product_pink.hex, value: "pink" },
    { key: "orange", name: "Orange", hex: COLOR_PALETTE.product_orange.hex, value: "orange" },
  ] as const;
}

/**
 * Get accent/category color options for category management
 * Maps to Ant Design tag colors for consistency
 * Used in CategoryManagerTab for category color selection
 *
 * @returns Array of accent color options
 *
 * @example
 * const accents = getAccentColorOptions();
 * // [
 * //   { key: "blue", name: "Blue", hex: "#1677FF", tag: "blue", value: "blue" },
 * //   { key: "gold", name: "Gold", hex: "#FFD700", tag: "gold", value: "gold" },
 * //   ...
 * // ]
 */
export const getAccentColorOptions = () => {
  return [
    { key: "blue", name: "Blue", hex: COLOR_PALETTE.blue_50.hex, tag: "blue", value: "blue" },
    { key: "gold", name: "Gold", hex: COLOR_PALETTE.gold_50.hex, tag: "gold", value: "gold" },
    { key: "green", name: "Green", hex: COLOR_PALETTE.green_50.hex, tag: "green", value: "green" },
    { key: "cyan", name: "Cyan", hex: COLOR_PALETTE.cyan_50.hex, tag: "cyan", value: "cyan" },
    { key: "purple", name: "Purple", hex: COLOR_PALETTE.purple_50.hex, tag: "purple", value: "purple" },
    { key: "red", name: "Red", hex: COLOR_PALETTE.red_50.hex, tag: "red", value: "red" },
    { key: "orange", name: "Orange", hex: COLOR_PALETTE.orange_50.hex, tag: "orange", value: "orange" },
    { key: "magenta", name: "Magenta", hex: COLOR_PALETTE.magenta_50.hex, tag: "magenta", value: "magenta" },
    { key: "volcano", name: "Volcano", hex: COLOR_PALETTE.orange_600.hex, tag: "volcano", value: "volcano" },
    { key: "lime", name: "Lime", hex: COLOR_PALETTE.lime.hex, tag: "lime", value: "lime" },
    { key: "geekblue", name: "Geek Blue", hex: COLOR_PALETTE.indigo_50.hex, tag: "geekblue", value: "geekblue" },
  ] as const;
}
