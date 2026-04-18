/**
 * Color System Barrel Export
 * Convenient central import point for all color utilities
 */

// ─────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────
export type {
  ColorKey,
  ColorDefinition,
  ColorPalette,
  ColorVariations,
  SemanticColorToken,
  NTCResult,
} from "../types/colors";

// ─────────────────────────────────────────────────────────────────────
// Color Palette & Utilities
// ─────────────────────────────────────────────────────────────────────
export {
  COLOR_PALETTE,
  getAllColorNames,
  getColorsByCategory,
  getColorsBySemantic,
} from "./colors";

// ─────────────────────────────────────────────────────────────────────
// Color Service Functions & Utilities
// ─────────────────────────────────────────────────────────────────────
export {
  getColorByKey,
  getColorHexByName,
  getColorBySemantic,
  getAllColors,
  getColorsByCategoryWrapped,
  getColorsBySemantics,
  getAllSemantics,
  getAllCategories,
  isValidHex,
  normalizeColor,
  findColorNameByHex,
  colorExists,
  clearColorCache,
  getColorCacheStats,
  getColorHex,
  getColorName,
} from "./colorService";

// ─────────────────────────────────────────────────────────────────────
// React Hooks
// ─────────────────────────────────────────────────────────────────────
export {
  useColor,
  useColorHex,
  useAllColors,
  useColorNames,
  useColorsByCategory,
  useColorsBySemantic,
  useSemanticColor,
  useColorCategories,
  useColorSemantics,
  useColorExists,
  useColorNameFromHex,
  useIsValidHex,
  useNormalizeColor,
} from "./colorHooks";
