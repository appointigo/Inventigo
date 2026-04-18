/**
 * Color System React Hooks
 * Convenient hooks for accessing color utilities in React components
 * All hooks are memoized to prevent unnecessary re-renders
 */

import { useMemo } from "react";
import {
  getColorByKey,
  getColorHexByName,
  getAllColors,
  getAllColorNames,
  getColorsByCategoryWrapped,
  getColorsBySemantics,
  getColorBySemantic,
  getAllCategories,
  getAllSemantics,
  colorExists,
  findColorNameByHex,
  isValidHex,
  normalizeColor,
} from "./colorService";
import type { ColorDefinition, ColorKey } from "../types/colors";

/**
 * Hook: Get color definition by key
 * Memoized to prevent recreation on each render
 *
 * @param key - Color key (e.g., "red_50", "blue_600")
 * @returns ColorDefinition
 * @throws Error if key not found
 *
 * @example
 * const color = useColor("red_50");
 * return <div style={{ color: color.hex }}>{color.name}</div>;
 */
export const useColor = (key: ColorKey | string): ColorDefinition => {
  return useMemo(() => {
    try {
      return getColorByKey(key);
    } 
    catch (error) {
      console.error(`[useColor] Failed to get color:`, error);
      throw error;
    }
  }, [key]);
}

/**
 * Hook: Get hex value by color name
 * Memoized and case-insensitive
 *
 * @param name - Color name (e.g., "Red", "red", "danger")
 * @returns Hex value or null
 *
 * @example
 * const redHex = useColorHex("Red");
 * return <div style={{ backgroundColor: redHex }}></div>;
 */
export const useColorHex = (name: string): string | null => {
  return useMemo(() => getColorHexByName(name), [name]);
};

/**
 * Hook: Get all colors
 * Perfect for color picker dropdowns
 * Memoized - returns same reference on re-render
 *
 * @returns Array of all color definitions
 *
 * @example
 * const allColors = useAllColors();
 * const options = allColors.map(c => ({
 *   label: c.name,
 *   value: c.hex,
 * }));
 */
export const useAllColors = (): Array<ColorDefinition> => {
  return useMemo(() => getAllColors(), []);
};

/**
 * Hook: Get color names for dropdown/select
 * Sorted alphabetically
 *
 * @returns Array of color names
 *
 * @example
 * const names = useColorNames();
 * <Select options={names.map(n => ({ label: n, value: n }))} />
 */
export const useColorNames = (): string[] => {
  return useMemo(() => getAllColorNames(), []);
};

/**
 * Hook: Get colors by category
 * Useful for filtering colors by type
 *
 * @param category - Category to filter by (e.g., "primary", "accent")
 * @returns Array of colors in that category, sorted by name
 *
 * @example
 * const primaryColors = useColorsByCategory("primary");
 * // [Red, Orange, Green, Blue, ...]
 */
export const useColorsByCategory = ( category: string ): Array<ColorDefinition> => {
  return useMemo(
    () => getColorsByCategoryWrapped(category),
    [category]
  );
};

/**
 * Hook: Get colors by semantic meaning
 * Useful for semantic color theming
 *
 * @param semantic - Semantic type (e.g., "error", "success", "warning")
 * @returns Array of colors with that semantic, sorted by name
 *
 * @example
 * const errorColors = useColorsBySemantic("error");
 * // [Red, Dark Red, ...]
 */
export const useColorsBySemantic = (semantic: string ): Array<ColorDefinition> => {
  return useMemo(
    () => getColorsBySemantics(semantic),
    [semantic]
  );
};

/**
 * Hook: Get single color by semantic meaning
 * Returns first match
 *
 * @param semantic - Semantic type (e.g., "error", "success")
 * @returns ColorDefinition or null
 *
 * @example
 * const errorColor = useSemanticColor("error");
 * return <Button style={{ background: errorColor?.hex }}>Delete</Button>;
 */
export const useSemanticColor = (semantic: string ): ColorDefinition | null => {
  return useMemo(
    () => getColorBySemantic(semantic),
    [semantic]
  );
};

/**
 * Hook: Get all available categories
 * Useful for category selection UI
 *
 * @returns Array of category names, sorted
 *
 * @example
 * const categories = useColorCategories();
 * // ["accent", "neutral", "primary", "product", "semantic"]
 */
export const useColorCategories = (): string[] => {
  return useMemo(() => getAllCategories(), []);
};

/**
 * Hook: Get all available semantic values
 * Useful for semantic color mapping
 *
 * @returns Array of semantic values, sorted
 *
 * @example
 * const semantics = useColorSemantics();
 * // ["error", "error-dark", "info", "success", ...]
 */
export const useColorSemantics = (): string[] => {
  return useMemo(() => getAllSemantics(), []);
};

/**
 * Hook: Check if color exists
 * Useful for validation
 *
 * @param nameOrKey - Color name or key
 * @returns true if color exists
 *
 * @example
 * if (useColorExists(userInput)) {
 *   // Valid color
 * }
 */
export const useColorExists = (nameOrKey: string): boolean => {
  return useMemo(() => colorExists(nameOrKey), [nameOrKey]);
}

/**
 * Hook: Find color name by hex
 * Useful for reverse lookup
 *
 * @param hex - Hex color code
 * @returns Color name or null
 *
 * @example
 * const colorName = useColorNameFromHex("#EF4444");
 * // "Red"
 */
export const useColorNameFromHex = (hex: string): string | null => {
  return useMemo(() => findColorNameByHex(hex), [hex]);
};

/**
 * Hook: Validate hex format
 * Useful for color input validation
 *
 * @param hex - Hex string to validate
 * @returns true if valid hex format
 *
 * @example
 * if (useIsValidHex(userInput)) {
 *   // Valid hex
 * }
 */
export const useIsValidHex = (hex: string): boolean => {
  return useMemo(() => isValidHex(hex), [hex]);
};

/**
 * Hook: Normalize color input
 * Converts hex, name, or key to normalized hex
 *
 * @param input - Color input (hex, name, or key)
 * @returns Normalized hex or null
 *
 * @example
 * const normalizedHex = useNormalizeColor("Red");
 * // "#EF4444"
 */
export const useNormalizeColor = (input: string): string | null => {
  return useMemo(() => normalizeColor(input), [input]);
};
