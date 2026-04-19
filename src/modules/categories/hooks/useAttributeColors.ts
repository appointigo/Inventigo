/**
 * useAttributeColors Hook
 * Provides color palette for attribute field builder
 * 
 * Features:
 * - Uses ColorService for all palette colors
 * - Memoized color lookup
 * - Fallback for missing colors
 */

import { useMemo, useCallback } from "react";
import { getAllColors, getColorHex } from "@/shared/theme/colorService";

export interface ColorOption {
  name: string;
  hex: string;
  semantic?: string;
  category?: string;
}

/**
 * Get all available colors from palette
 * Used in attribute color field dropdown
 * 
 * @example
 * const { colors, getHex } = useAttributeColors();
 * // colors: [{ name: "Red", hex: "#E53E3E", ... }, ...]
 */
export const useAttributeColors = (): { colors: ColorOption[]; getHex: (colorName: string) => string } => {
  const colors = useMemo(() => {
    return getAllColors();
  }, []);

  const getHex = useCallback((colorName: string): string => {
    return getColorHex(colorName, "#999999") || "#999999";
  }, []);

  return { colors, getHex };
}

/**
 * Helper: Check if color name exists in palette
 * 
 * @example
 * const exists = useColorExists("Red");  // true
 * const exists = useColorExists("Unknown"); // false
 */
export const useColorExists = (colorName: string): boolean => {
  return useMemo(() => {
    if (!colorName) return false;
    return getColorHex(colorName) !== null;
  }, [colorName]);
}

/**
 * Get color by name with validation
 * Returns hex or fallback
 * 
 * @example
 * const hex = useColorHex("Red");  // "#E53E3E"
 * const hex = useColorHex("Unknown"); // "#999999" (fallback)
 */
export const useColorHex = (colorName: string): string => {
  return useMemo(
    () => getColorHex(colorName, "#999999") || "#999999",
    [colorName]
  );
}
