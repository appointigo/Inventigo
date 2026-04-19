/**
 * useExpenseColors Hook
 * Provides semantic colors for expense categories with memoization
 * 
 * Benefits:
 * - Centralized color logic (no hardcoding in components)
 * - Memoized to prevent unnecessary re-renders
 * - Easy to extend with new categories
 * - Type-safe category access
 */

import { useMemo } from "react";
import { EXPENSE_CATEGORY_COLORS } from "@/shared/constants/colorMappings";

export type CategoryColorConfig = typeof EXPENSE_CATEGORY_COLORS[keyof typeof EXPENSE_CATEGORY_COLORS];

/**
 * Get colors for an expense category
 * 
 * @param category - Category name (e.g., "Rent", "Electricity")
 * @returns Colors object or default fallback
 * 
 * @example
 * const { colors } = useExpenseColors("Rent");
 * return <div style={{ background: colors.bg, color: colors.text }}>
 */
export const useExpenseColors = (category: string | null): { colors: CategoryColorConfig; categoryName: string } => {
  return useMemo(() => {
    const normalized = (category ?? "").trim();
    const colors = EXPENSE_CATEGORY_COLORS[normalized];
    
    if (!colors) {
      // Fallback for unknown categories
      return {
        categoryName: normalized || "Unknown",
        colors: {
          bg: "#f3f4f6",
          text: "#475569",
          border: "#e5e7eb",
          dot: "#6b7280",
        },
      };
    }

    return {
      categoryName: normalized,
      colors,
    };
  }, [category]);
}

/**
 * Get all available expense category names
 * Useful for dropdowns and category selectors
 * 
 * @example
 * const categories = useExpenseCategoryList();
 * // ["Rent", "Electricity", "Water", ...]
 */
export const useExpenseCategoryList = (): string[] => {
  return useMemo(() => Object.keys(EXPENSE_CATEGORY_COLORS), []);
};

/**
 * Check if a category exists in the color mapping
 * 
 * @example
 * const hasColor = useCategoryExists("Rent");  // true
 * const hasColor = useCategoryExists("Unknown"); // false
 */
export const useCategoryExists = (category: string): boolean => {
  return useMemo(
    () => !!(category && category in EXPENSE_CATEGORY_COLORS),
    [category]
  );
}
