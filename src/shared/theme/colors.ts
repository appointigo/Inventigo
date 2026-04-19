/**
 * Master Color Palette
 * Single source of truth for all application colors
 * Organized by color families for easy discovery
 * 
 * Key Points:
 * - No hardcoding in components (always reference here)
 * - Each color has name, hex, semantic meaning, and category
 * - Aliases support multiple ways to reference the same color
 * - Easy to extend: just add new color objects
 */

import type { ColorPalette } from "../types/colors";

export const COLOR_PALETTE: ColorPalette = {
  // ─────────────────────────────────────────────────────────────────────
  // REDS & WARM REDS
  // ─────────────────────────────────────────────────────────────────────

  red_50: {
    name: "Red",
    hex: "#EF4444",
    semantic: "error",
    category: "primary",
    aliases: ["danger", "critical", "alert"],
  },

  red_600: {
    name: "Dark Red",
    hex: "#DC2626",
    semantic: "error-dark",
    category: "primary",
  },

  rose_50: {
    name: "Rose",
    hex: "#F43F5E",
    semantic: "error-light",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // ORANGES & AMBERS
  // ─────────────────────────────────────────────────────────────────────

  orange_50: {
    name: "Orange",
    hex: "#FA8C16",
    semantic: "warning",
    category: "primary",
    aliases: ["alert", "caution"],
  },

  orange_600: {
    name: "Dark Orange",
    hex: "#EA580C",
    semantic: "warning-dark",
    category: "primary",
  },

  amber_50: {
    name: "Amber",
    hex: "#F59E0B",
    semantic: "warning-light",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // YELLOWS & GOLDS
  // ─────────────────────────────────────────────────────────────────────

  yellow_50: {
    name: "Yellow",
    hex: "#FADB14",
    semantic: "highlight",
    category: "accent",
  },

  gold_50: {
    name: "Gold",
    hex: "#FFD700",
    semantic: "premium",
    category: "accent",
    aliases: ["luxury", "elite"],
  },

  // ─────────────────────────────────────────────────────────────────────
  // GREENS
  // ─────────────────────────────────────────────────────────────────────

  green_50: {
    name: "Green",
    hex: "#52C41A",
    semantic: "success",
    category: "primary",
    aliases: ["positive", "approved", "valid"],
  },

  green_600: {
    name: "Dark Green",
    hex: "#15803D",
    semantic: "success-dark",
    category: "primary",
  },

  green_light: {
    name: "Light Green",
    hex: "#95DE64",
    semantic: "success-light",
    category: "accent",
  },

  emerald_50: {
    name: "Emerald",
    hex: "#10B981",
    semantic: "success-alt",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // TEALS & CYANS
  // ─────────────────────────────────────────────────────────────────────

  teal_50: {
    name: "Teal",
    hex: "#14B8A6",
    semantic: "info-alt",
    category: "accent",
  },

  cyan_50: {
    name: "Cyan",
    hex: "#13C2C2",
    semantic: "info",
    category: "accent",
    aliases: ["aqua"],
  },

  cyan_light: {
    name: "Light Cyan",
    hex: "#4FD1C5",
    semantic: "info-light",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // BLUES
  // ─────────────────────────────────────────────────────────────────────

  blue_50: {
    name: "Blue",
    hex: "#1677FF",
    semantic: "primary",
    category: "primary",
    aliases: ["main", "brand"],
  },

  blue_600: {
    name: "Dark Blue",
    hex: "#2563EB",
    semantic: "primary-dark",
    category: "primary",
  },

  blue_light: {
    name: "Light Blue",
    hex: "#63B3ED",
    semantic: "primary-light",
    category: "accent",
  },

  sky_blue: {
    name: "Sky Blue",
    hex: "#0EA5E9",
    semantic: "info-light",
    category: "accent",
  },

  navy: {
    name: "Navy",
    hex: "#1E3A8A",
    semantic: "primary-darker",
    category: "primary",
    aliases: ["dark-navy"],
  },

  // ─────────────────────────────────────────────────────────────────────
  // INDIGOS
  // ─────────────────────────────────────────────────────────────────────

  indigo_50: {
    name: "Indigo",
    hex: "#4F46E5",
    semantic: "accent",
    category: "accent",
  },

  indigo_600: {
    name: "Dark Indigo",
    hex: "#4338CA",
    semantic: "accent-dark",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // VIOLETS & PURPLES
  // ─────────────────────────────────────────────────────────────────────

  violet_50: {
    name: "Violet",
    hex: "#A78BFA",
    semantic: "accent",
    category: "accent",
  },

  purple_50: {
    name: "Purple",
    hex: "#722ED1",
    semantic: "premium",
    category: "accent",
    aliases: ["premium-alt"],
  },

  purple_light: {
    name: "Light Purple",
    hex: "#B78FFF",
    semantic: "accent-light",
    category: "accent",
  },

  fuchsia_50: {
    name: "Fuchsia",
    hex: "#D946EF",
    semantic: "accent",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // PINKS & MAGENTAS
  // ─────────────────────────────────────────────────────────────────────

  pink_50: {
    name: "Pink",
    hex: "#EC4899",
    semantic: "accent-light",
    category: "accent",
  },

  magenta_50: {
    name: "Magenta",
    hex: "#EB2F96",
    semantic: "accent",
    category: "accent",
  },

  magenta_light: {
    name: "Light Magenta",
    hex: "#F687B3",
    semantic: "accent-light",
    category: "accent",
  },

  // ─────────────────────────────────────────────────────────────────────
  // BROWNS & WARM NEUTRALS
  // ─────────────────────────────────────────────────────────────────────

  brown_50: {
    name: "Brown",
    hex: "#92400E",
    semantic: "neutral",
    category: "neutral",
  },

  tan_50: {
    name: "Tan",
    hex: "#D2B48C",
    semantic: "neutral-light",
    category: "neutral",
  },

  sienna_50: {
    name: "Sienna",
    hex: "#A16207",
    semantic: "neutral",
    category: "neutral",
  },

  // ─────────────────────────────────────────────────────────────────────
  // GRAYS & NEUTRALS (PRIMARY)
  // ─────────────────────────────────────────────────────────────────────

  white: {
    name: "White",
    hex: "#FFFFFF",
    semantic: "surface",
    category: "neutral",
  },

  black: {
    name: "Black",
    hex: "#0F0F0F",
    semantic: "text",
    category: "neutral",
  },

  gray_50: {
    name: "Gray 50",
    hex: "#F9FAFB",
    semantic: "background",
    category: "neutral",
  },

  gray_100: {
    name: "Gray 100",
    hex: "#F3F4F6",
    semantic: "surface-subtle",
    category: "neutral",
  },

  gray_200: {
    name: "Gray 200",
    hex: "#E5E7EB",
    semantic: "border",
    category: "neutral",
  },

  gray_300: {
    name: "Gray 300",
    hex: "#D1D5DB",
    semantic: "border-light",
    category: "neutral",
  },

  gray_400: {
    name: "Gray 400",
    hex: "#9CA3AF",
    semantic: "text-muted",
    category: "neutral",
  },

  gray_500: {
    name: "Gray 500",
    hex: "#6B7280",
    semantic: "text-secondary",
    category: "neutral",
  },

  gray_600: {
    name: "Gray 600",
    hex: "#4B5563",
    semantic: "text-tertiary",
    category: "neutral",
  },

  gray_700: {
    name: "Gray 700",
    hex: "#374151",
    semantic: "text-primary",
    category: "neutral",
  },

  gray_800: {
    name: "Gray 800",
    hex: "#1F2937",
    semantic: "text",
    category: "neutral",
  },

  gray_900: {
    name: "Gray 900",
    hex: "#111827",
    semantic: "text-dark",
    category: "neutral",
  },

  // ─────────────────────────────────────────────────────────────────────
  // LIGHT GRAYS & OFFWHITES
  // ─────────────────────────────────────────────────────────────────────

  light_gray: {
    name: "Light Grey",
    hex: "#E2E8F0",
    semantic: "border",
    category: "neutral",
  },

  slate_50: {
    name: "Slate 50",
    hex: "#F8FAFC",
    semantic: "background",
    category: "neutral",
  },

  slate_100: {
    name: "Slate 100",
    hex: "#F1F5F9",
    semantic: "surface-subtle",
    category: "neutral",
  },

  slate_200: {
    name: "Slate 200",
    hex: "#E2E8F0",
    semantic: "border",
    category: "neutral",
  },

  stone_50: {
    name: "Stone 50",
    hex: "#FAFAF9",
    semantic: "background",
    category: "neutral",
  },

  // ─────────────────────────────────────────────────────────────────────
  // PRODUCT COLORS (For variants: shirts, items, etc.)
  // ─────────────────────────────────────────────────────────────────────

  product_red: {
    name: "Product Red",
    hex: "#E53E3E",
    category: "product",
    aliases: ["fabric-red"],
  },

  product_blue: {
    name: "Product Blue",
    hex: "#4299E1",
    category: "product",
    aliases: ["fabric-blue"],
  },

  product_black: {
    name: "Product Black",
    hex: "#1A202C",
    category: "product",
    aliases: ["fabric-black"],
  },

  product_white_off: {
    name: "Product White",
    hex: "#F7FAFC",
    category: "product",
    aliases: ["fabric-white", "cream"],
  },

  product_navy: {
    name: "Product Navy",
    hex: "#2C5282",
    category: "product",
    aliases: ["fabric-navy"],
  },

  product_green: {
    name: "Product Green",
    hex: "#22543D",
    category: "product",
    aliases: ["fabric-green"],
  },

  product_gray: {
    name: "Product Gray",
    hex: "#718096",
    category: "product",
    aliases: ["fabric-gray"],
  },

  product_brown: {
    name: "Product Brown",
    hex: "#744210",
    category: "product",
    aliases: ["fabric-brown"],
  },

  product_pink: {
    name: "Product Pink",
    hex: "#ED64A6",
    category: "product",
    aliases: ["fabric-pink"],
  },

  product_orange: {
    name: "Product Orange",
    hex: "#ED8936",
    category: "product",
    aliases: ["fabric-orange"],
  },

  // ─────────────────────────────────────────────────────────────────────
  // SEMANTIC STATUS COLORS
  // ─────────────────────────────────────────────────────────────────────

  success_dark: {
    name: "Success Dark",
    hex: "#059669",
    semantic: "success",
    category: "semantic",
  },

  warning_dark: {
    name: "Warning Dark",
    hex: "#D97706",
    semantic: "warning",
    category: "semantic",
  },

  error_dark: {
    name: "Error Dark",
    hex: "#DC2626",
    semantic: "error",
    category: "semantic",
  },

  info_dark: {
    name: "Info Dark",
    hex: "#0891B2",
    semantic: "info",
    category: "semantic",
  },

  // ─────────────────────────────────────────────────────────────────────
  // ADDITIONAL USEFUL COLORS
  // ─────────────────────────────────────────────────────────────────────

  coral: {
    name: "Coral",
    hex: "#FF6B6B",
    category: "accent",
  },

  peach: {
    name: "Peach",
    hex: "#FFCC99",
    category: "accent",
  },

  mint: {
    name: "Mint",
    hex: "#98D8C8",
    category: "accent",
  },

  lavender: {
    name: "Lavender",
    hex: "#E6D5FF",
    category: "accent",
  },

  lime: {
    name: "Lime",
    hex: "#A4DE6C",
    category: "accent",
  },
} as const;

/**
 * Helper: Get all unique color names (for dropdowns, etc.)
 * @returns Array of color names sorted alphabetically
 */
export const getAllColorNames = (): string[] => {
  return Object.values(COLOR_PALETTE)
    .map((color) => color.name)
    .sort();
}

/**
 * Helper: Get colors by category
 * @param category - Filter by category (primary, accent, neutral, product, semantic)
 * @returns Array of colors in that category
 */
export const getColorsByCategory = ( category: string ): Array<typeof COLOR_PALETTE[keyof typeof COLOR_PALETTE]> => {
  return Object.values(COLOR_PALETTE).filter(
    (color) => color.category === category
  );
}

/**
 * Helper: Get colors by semantic meaning
 * @param semantic - Filter by semantic (error, warning, success, info, etc.)
 * @returns Array of colors with that semantic meaning
 */
export const getColorsBySemantic = ( semantic: string ): Array<typeof COLOR_PALETTE[keyof typeof COLOR_PALETTE]> => {
  return Object.values(COLOR_PALETTE).filter(
    (color) => color.semantic === semantic
  );
}
