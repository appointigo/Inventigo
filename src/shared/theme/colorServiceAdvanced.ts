/**
 * Advanced Color Service - Phase 2
 * Chroma-js based features for color manipulation, variations, and accessibility
 * 
 * Features:
 * - Color variations (tints, shades, disabled states)
 * - WCAG contrast validation
 * - Color harmony generation
 * - Accessibility checking
 */

import chroma from "chroma-js";
import type { ColorVariations, WCAGLevel } from "../types/colors";
import {
  getContrastRatio,
  isAccessible as checkAccessible,
  getContrastingTextColor,
  generateColorVariations,
  getComplementaryColor,
  getAnalogousColors,
  getTriadicColors,
  getTetradicColors,
  hexToRgba,
} from "./colorUtils";

// ─────────────────────────────────────────────────────────────────────
// COLOR VARIATIONS & MANIPULATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate color variations for a given hex color
 * Includes tints, shades, light, dark, and disabled versions
 *
 * @param hex - Base hex color
 * @returns ColorVariations object with all variations
 *
 * @example
 * const variations = getVariations("#EF4444");
 * // { base, tint, shade, light, dark, disabled }
 */
export const getVariations = (hex: string): ColorVariations => {
  return generateColorVariations(hex);
}

/**
 * Get color with specific opacity
 * Useful for overlay effects
 *
 * @param hex - Hex color
 * @param opacity - Opacity level (0-1)
 * @returns RGBA string
 *
 * @example
 * getColorWithOpacity("#EF4444", 0.5) // "rgba(239, 68, 68, 0.5)"
 */
export const getColorWithOpacity = (hex: string, opacity: number): string => {
  return hexToRgba(hex, opacity);
}

// ─────────────────────────────────────────────────────────────────────
// WCAG CONTRAST & ACCESSIBILITY
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate contrast ratio between two colors
 * WCAG standard: 1-21 (higher = better)
 *
 * @param foreground - Text/foreground color
 * @param background - Background color
 * @returns Contrast ratio (1-21)
 *
 * @example
 * getContrast("#000000", "#FFFFFF") // 21 (maximum)
 * getContrast("#FFFFFF", "#FFFF00") // ~1.08 (poor)
 */
export const getContrast = (foreground: string, background: string): number => {
  return getContrastRatio(foreground, background);
};

/**
 * Check if color combination meets WCAG accessibility standards
 *
 * @param foreground - Text/foreground color
 * @param background - Background color
 * @param level - WCAG level: "AA" (4.5:1) or "AAA" (7:1)
 * @returns true if meets standard
 *
 * @example
 * isAccessible("#000000", "#FFFFFF", "AA")  // true
 * isAccessible("#666666", "#999999", "AA")  // false
 */
export const isAccessible = ( foreground: string, background: string, level: WCAGLevel = "AA" ): boolean => {
  return checkAccessible(foreground, background, level);
};

/**
 * Get best contrasting text color for background (black or white)
 * Uses proper WCAG luminance calculation
 *
 * @param backgroundColor - Background hex color
 * @returns "#000000" or "#FFFFFF"
 *
 * @example
 * getContrastingText("#FFFFFF") // "#000000"
 * getContrastingText("#000000") // "#FFFFFF"
 */
export const getContrastingText = (backgroundColor: string): string => {
  return getContrastingTextColor(backgroundColor);
}

/**
 * Find most readable text color that meets WCAG AA standards
 * Tries both black and white, returns whichever has better contrast
 *
 * @param backgroundColor - Background hex color
 * @returns "#000000" or "#FFFFFF"
 */
export const getAccessibleTextColor = (backgroundColor: string): string => {
  const blackContrast = getContrast("#000000", backgroundColor);
  const whiteContrast = getContrast("#FFFFFF", backgroundColor);

  // If both meet AA standard, return the one with better contrast
  const aaThreshold = 4.5;
  const blackMeetsAA = blackContrast >= aaThreshold;
  const whiteMeetsAA = whiteContrast >= aaThreshold;

  if (blackMeetsAA && whiteMeetsAA) {
    return blackContrast > whiteContrast ? "#000000" : "#FFFFFF";
  }
  if (blackMeetsAA) return "#000000";
  if (whiteMeetsAA) return "#FFFFFF";

  // Neither meets AA, return the one with better contrast
  return blackContrast > whiteContrast ? "#000000" : "#FFFFFF";
}

// ─────────────────────────────────────────────────────────────────────
// COLOR HARMONIES & SCHEMES
// ─────────────────────────────────────────────────────────────────────

/**
 * Get color harmony scheme
 * Returns array of harmonious colors based on color wheel relationships
 *
 * @param hex - Base hex color
 * @param type - Harmony type: complementary, triadic, analogous, tetradic
 * @returns Array of hex colors
 *
 * @example
 * getHarmony("#EF4444", "triadic") // [red, blue, yellow]
 * getHarmony("#EF4444", "complementary") // [red, cyan]
 */
export const getHarmony = (
  hex: string,
  type: "complementary" | "triadic" | "analogous" | "tetradic" = "complementary"
): string[] => {
  try {
    switch (type) {
      case "complementary":
        return [hex, getComplementaryColor(hex)];
      case "triadic":
        return getTriadicColors(hex);
      case "analogous":
        return getAnalogousColors(hex, 2, 30);
      case "tetradic":
        return getTetradicColors(hex);
      default:
        return [hex];
    }
  } catch {
    return [hex];
  }
}

/**
 * Get split-complementary color scheme
 * Similar to complementary but uses colors adjacent to complement
 */
export const getSplitComplementaryColors = (hex: string): string[] => {
  try {
    const complementary = getComplementaryColor(hex);
    const compHsl = chroma(complementary).hsl();
    return [
      hex,
      chroma.hsl((compHsl[0] - 30 + 360) % 360, compHsl[1], compHsl[2]).hex(),
      chroma.hsl((compHsl[0] + 30) % 360, compHsl[1], compHsl[2]).hex(),
    ];
  } 
  catch {
    return [hex];
  }
}

// ─────────────────────────────────────────────────────────────────────
// COLOR SPACE CONVERSIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Convert hex to HSL
 * @param hex - Hex color
 * @returns { h, s, l } object
 */
export const hexToHSL = ( hex: string ): { h: number; s: number; l: number } => {
  try {
    const [h, s, l] = chroma(hex).hsl();
    return { h: h || 0, s: s || 0, l };
  } 
  catch {
    return { h: 0, s: 0, l: 0 };
  }
}

/**
 * Convert hex to RGB
 * @param hex - Hex color
 * @returns { r, g, b } object
 */
export const hexToRGB = (hex: string): { r: number; g: number; b: number } => {
  try {
    const [r, g, b] = chroma(hex).rgb();
    return { r, g, b };
  } 
  catch {
    return { r: 0, g: 0, b: 0 };
  }
}

/**
 * Convert RGB to hex
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  try {
    return chroma(r, g, b).hex();
  } 
  catch {
    return "#000000";
  }
}

/**
 * Convert HSL to hex
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  try {
    return chroma.hsl(h, s / 100, l / 100).hex();
  } 
  catch {
    return "#000000";
  }
}

// ─────────────────────────────────────────────────────────────────────
// COLOR DISTANCE & SIMILARITY
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate delta E (color distance) between two colors
 * Higher values = more different colors
 * Uses CIE Delta E (1976) formula
 *
 * @param hex1 - First color
 * @param hex2 - Second color
 * @returns Distance (0-100)
 */
export const getColorDistance = (hex1: string, hex2: string): number => {
  try {
    return chroma.deltaE(hex1, hex2);
  } 
  catch {
    return 0;
  }
}

/**
 * Check if two colors are similar
 * Based on delta E threshold
 *
 * @param hex1 - First color
 * @param hex2 - Second color
 * @param threshold - Similarity threshold (default: 10)
 * @returns true if colors are similar
 */
export const areColorsSimilar = (
  hex1: string,
  hex2: string,
  threshold: number = 10
): boolean => {
  return getColorDistance(hex1, hex2) <= threshold;
}

// ─────────────────────────────────────────────────────────────────────
// COLOR SCALE & INTERPOLATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate color scale between two colors
 * Useful for gradients, heatmaps, etc.
 *
 * @param color1 - Start color
 * @param color2 - End color
 * @param steps - Number of steps (default: 5)
 * @returns Array of hex colors
 *
 * @example
 * getColorScale("#FF0000", "#0000FF", 5) 
 * // [red, purple, blue]
 */
export const getColorScale = (
  color1: string,
  color2: string,
  steps: number = 5
): string[] => {
  try {
    const scale = chroma.scale([color1, color2]).colors(steps);
    return scale;
  } 
  catch {
    return [color1, color2];
  }
}

/**
 * Generate color palette with multiple colors
 * Useful for creating consistent color schemes
 *
 * @param colors - Array of colors
 * @param steps - Number of steps in scale
 * @returns Array of interpolated hex colors
 */
export const getMultiColorScale = (colors: string[], steps: number = 5): string[] => {
  try {
    return chroma.scale(colors).colors(steps);
  } 
  catch {
    return colors;
  }
}

// ─────────────────────────────────────────────────────────────────────
// COLOR VALIDATION & INFO
// ─────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive color information
 * Returns all useful color data in one call
 */
export const getColorInfo = (hex: string): {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  rgba: string;
  name?: string;
  isBright: boolean;
  isDark: boolean;
  saturation: number;
  luminance: number;
} => {
  const rgb = hexToRGB(hex);
  const hsl = hexToHSL(hex);
  const luminance = chroma(hex).luminance();
  const isBright = luminance > 0.5;
  const isDark = luminance < 0.3;

  return {
    hex: hex.toUpperCase(),
    rgb,
    hsl,
    rgba: hexToRgba(hex, 1),
    isBright,
    isDark,
    saturation: hsl.s,
    luminance,
  };
}
