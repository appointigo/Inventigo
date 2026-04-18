/**
 * Color Mappings & Semantic Tokens
 * Provides semantic color associations for different contexts
 * 
 * Examples:
 * - Role colors (admin, staff, etc.)
 * - Category colors (expense types, attributes)
 * - Status colors (success, error, warning, info)
 */

import type { SemanticColorToken } from "../types/colors";

// ─────────────────────────────────────────────────────────────────────
// SEMANTIC STATUS COLORS
// ─────────────────────────────────────────────────────────────────────

export const SEMANTIC_COLORS: Record<string, SemanticColorToken> = {
  /** Success state - green */
  success: {
    light: "#10B981",
    dark: "#059669",
  },

  /** Error state - red */
  error: {
    light: "#EF4444",
    dark: "#DC2626",
  },

  /** Warning state - orange/amber */
  warning: {
    light: "#F59E0B",
    dark: "#D97706",
  },

  /** Info state - blue */
  info: {
    light: "#3B82F6",
    dark: "#2563EB",
  },

  /** Primary action - blue */
  primary: {
    light: "#3B82F6",
    dark: "#1E40AF",
  },

  /** Secondary action - neutral */
  secondary: {
    light: "#6B7280",
    dark: "#374151",
  },

  /** Danger/destructive - dark red */
  danger: {
    light: "#DC2626",
    dark: "#991B1B",
  },
};

// ─────────────────────────────────────────────────────────────────────
// ROLE COLORS (for user badges, avatars)
// ─────────────────────────────────────────────────────────────────────

export const ROLE_COLOR_MAP: Record<string, string> = {
  "Super Admin": "#EA580C",    // Dark Orange - highest privilege
  "Owner": "#805AD5",          // Violet - owner designation
  "Admin": "#EF4444",          // Red - admin privilege
  "Manager": "#1677FF",        // Blue - manager role
  "Staff": "#52C41A",          // Green - staff role
};

// ─────────────────────────────────────────────────────────────────────
// EXPENSE CATEGORY COLORS
// ─────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORY_COLORS: Record<
  string,
  {
    bg: string;      // Background color (light)
    text: string;    // Text color
    border: string;  // Border color
    dot: string;     // Indicator dot color
  }
> = {
  Rent: {
    bg: "#eff6ff",
    text: "#2563eb",
    border: "#93c5fd",
    dot: "#3b82f6",
  },
  Electricity: {
    bg: "#fffbeb",
    text: "#d97706",
    border: "#fcd34d",
    dot: "#f59e0b",
  },
  Water: {
    bg: "#ecf0ff",
    text: "#4f46e5",
    border: "#a5b4fc",
    dot: "#6366f1",
  },
  Internet: {
    bg: "#f3e8ff",
    text: "#7c3aed",
    border: "#d8b4fe",
    dot: "#a855f7",
  },
  Maintenance: {
    bg: "#fce7f3",
    text: "#be185d",
    border: "#fbcfe8",
    dot: "#ec4899",
  },
  Cleaning: {
    bg: "#ecfdf5",
    text: "#059669",
    border: "#a7f3d0",
    dot: "#10b981",
  },
  Supplies: {
    bg: "#faf5ff",
    text: "#7e22ce",
    border: "#e9d5ff",
    dot: "#a855f7",
  },
  Equipment: {
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
    dot: "#22c55e",
  },
  Transport: {
    bg: "#fef3c7",
    text: "#92400e",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  Food: {
    bg: "#fef2f2",
    text: "#7f1d1d",
    border: "#fecaca",
    dot: "#ef4444",
  },
  Entertainment: {
    bg: "#fef3c7",
    text: "#b45309",
    border: "#fcd34d",
    dot: "#f59e0b",
  },
  Healthcare: {
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fca5a5",
    dot: "#dc2626",
  },
  Insurance: {
    bg: "#e0e7ff",
    text: "#3730a3",
    border: "#c7d2fe",
    dot: "#6366f1",
  },
  Utilities: {
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#6ee7b7",
    dot: "#10b981",
  },
  Miscellaneous: {
    bg: "#f3f4f6",
    text: "#374151",
    border: "#d1d5db",
    dot: "#6b7280",
  },
};

// ─────────────────────────────────────────────────────────────────────
// STOCK STATUS COLORS
// ─────────────────────────────────────────────────────────────────────

export const STOCK_STATUS_COLORS: Record<string, string> = {
  "In Stock": "#10B981",         // Green - available
  "Low Stock": "#F59E0B",         // Orange - warning
  "Out of Stock": "#EF4444",      // Red - unavailable
  "Discontinued": "#6B7280",      // Gray - discontinued
};

// ─────────────────────────────────────────────────────────────────────
// ATTRIBUTE CATEGORY COLORS
// ─────────────────────────────────────────────────────────────────────

export const ATTRIBUTE_CATEGORY_COLORS: Record<string, string> = {
  Color: "#EF4444",
  Size: "#F59E0B",
  Brand: "#10B981",
  Style: "#3B82F6",
  Material: "#8B5CF6",
  Weight: "#06B6D4",
  Dimensions: "#EC4899",
  Other: "#6B7280",
};

// ─────────────────────────────────────────────────────────────────────
// PRIORITY LEVEL COLORS
// ─────────────────────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<string, string> = {
  "Critical": "#DC2626",    // Dark Red
  "High": "#EF4444",        // Red
  "Medium": "#F59E0B",      // Orange
  "Low": "#10B981",         // Green
};

// ─────────────────────────────────────────────────────────────────────
// THEME COLORS (Light/Dark mode support)
// ─────────────────────────────────────────────────────────────────────

export const THEME_COLORS = {
  light: {
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#111827",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    divider: "#F3F4F6",
  },
  dark: {
    background: "#111827",
    surface: "#1F2937",
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    border: "#374151",
    divider: "#1F2937",
  },
};

// ─────────────────────────────────────────────────────────────────────
// CHART/VISUALIZATION COLORS
// ─────────────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  "#EF4444", // Red
  "#F59E0B", // Orange
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange-red
  "#06B6D4", // Sky blue
  "#A855F7", // Violet
];

// ─────────────────────────────────────────────────────────────────────
// BRAND COLORS (Inventigo specific)
// ─────────────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  primary: "#3B82F6",       // Blue
  secondary: "#8B5CF6",     // Purple
  accent: "#EC4899",        // Pink
  success: "#10B981",       // Green
  warning: "#F59E0B",       // Orange
  error: "#EF4444",         // Red
};
