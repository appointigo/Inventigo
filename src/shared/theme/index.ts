/**
 * Color System Barrel Export
 * Convenient central import point for all color utilities (Phase 1 & 2)
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
  ExtractedColor,
  WCAGLevel,
  HarmonyType,
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
// Color Service Functions (Phase 1)
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
// Advanced Color Service (Phase 2)
// ─────────────────────────────────────────────────────────────────────
export {
  getVariations,
  getColorWithOpacity,
  getContrast,
  isAccessible,
  getContrastingText,
  getAccessibleTextColor,
  getHarmony,
  getSplitComplementaryColors,
  hexToHSL,
  hexToRGB,
  rgbToHex,
  hslToHex,
  getColorDistance,
  areColorsSimilar,
  getColorScale,
  getMultiColorScale,
  getColorInfo,
} from "./colorServiceAdvanced";

// ─────────────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────────────
export {
  calculateRelativeLuminance,
  getContrastRatio,
  getContrastingTextColor,
  hexToRgba,
  lightenColor,
  darkenColor,
  generateColorVariations,
  getComplementaryColor,
  getAnalogousColors,
  getTriadicColors,
  getTetradicColors,
} from "./colorUtils";

// ─────────────────────────────────────────────────────────────────────
// Color Naming Service (Phase 2)
// ─────────────────────────────────────────────────────────────────────
export {
  getColorNameFromHex,
  getColorDefinitionFromHex,
  getColorMetadata,
  inferSemanticFromColor,
  findSimilarColors,
  getColorsBySemantic as getColorsBySemanticNaming,
  extractAndNameColors,
  extractDominantColors,
  extractColorsFromImage,
  extractColorsFromCanvas,
  analyzePaletteAccessibility,
} from "./colorNaming";

// ─────────────────────────────────────────────────────────────────────
// React Hooks (Phase 1)
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

// ─────────────────────────────────────────────────────────────────────
// Advanced React Hooks (Phase 2)
// ─────────────────────────────────────────────────────────────────────
export {
  useColorVariations,
  useContrast,
  useIsAccessible,
  useContrastingText,
  useColorHarmony,
  useColorScale,
  useColorInfo,
  useColorName,
  useColorMetadata,
  useInferSemantic,
  useSimilarColors,
  useExtractColors,
  useCanvasColors,
  usePaletteAccessibility,
} from "./colorHooksAdvanced";
