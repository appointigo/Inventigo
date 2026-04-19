/**
 * Color Naming Service - Phase 2
 * Reverse lookup and semantic inference for colors
 * 
 * Features:
 * - Find color names from hex values (with fuzzy matching)
 * - Infer semantic meaning from color
 * - Extract dominant colors from image
 * - Batch color naming
 */

import { COLOR_PALETTE } from "./colors";
import { getColorDistance, hexToHSL } from "./colorServiceAdvanced";
import type { ColorDefinition, ExtractedColor } from "../types/colors";

// ─────────────────────────────────────────────────────────────────────
// COLOR NAMING - REVERSE LOOKUP
// ─────────────────────────────────────────────────────────────────────

/**
 * Find color name by hex (with fuzzy matching)
 * Returns exact match if available, otherwise closest color
 *
 * @param hex - Hex color code
 * @param maxDistance - Maximum allowed distance for fuzzy match (default: 15)
 * @returns Color name or null if no match found
 *
 * @example
 * getColorNameFromHex("#EF4444") // "Red" (exact match)
 * getColorNameFromHex("#FF0000") // "Red" (fuzzy match, close color)
 */
export const getColorNameFromHex = ( hex: string, maxDistance: number = 15 ): string | null => {
  // First try exact match
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.hex.toUpperCase() === hex.toUpperCase()) {
      return color.name;
    }
  }

  // Try fuzzy match using color distance
  let closestColor: ColorDefinition | null = null;
  let closestDistance = maxDistance;

  for (const color of Object.values(COLOR_PALETTE)) {
    const distance = getColorDistance(hex, color.hex);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestColor = color;
    }
  }

  return closestColor ? closestColor.name : null;
}

/**
 * Find complete color definition by hex
 * Useful for getting full metadata (semantic, category, etc.)
 */
export const getColorDefinitionFromHex = ( hex: string, maxDistance: number = 15 ): ColorDefinition | null => {
  // Exact match
  for (const color of Object.values(COLOR_PALETTE)) {
    if (color.hex.toUpperCase() === hex.toUpperCase()) {
      return color;
    }
  }

  // Fuzzy match
  let closestColor: ColorDefinition | null = null;
  let closestDistance = maxDistance;

  for (const color of Object.values(COLOR_PALETTE)) {
    const distance = getColorDistance(hex, color.hex);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

/**
 * Get color metadata from hex (name, semantic, category)
 */
export const getColorMetadata = (hex: string): {
  hex: string;
  name: string | null;
  semantic: string | null;
  category: string | null;
  distance: number;
} => {
  const definition = getColorDefinitionFromHex(hex, 30);
  const distance = definition ? getColorDistance(hex, definition.hex) : 100;

  return {
    hex: hex.toUpperCase(),
    name: definition?.name || null,
    semantic: definition?.semantic || null,
    category: definition?.category || null,
    distance: Math.round(distance * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SEMANTIC INFERENCE
// ─────────────────────────────────────────────────────────────────────

/**
 * Infer semantic meaning from color properties
 * Uses hue, saturation, and lightness to guess semantic meaning
 *
 * @param hex - Hex color
 * @returns Inferred semantic (error, warning, success, info, etc.) or null
 */
export const inferSemanticFromColor = (hex: string): string | null => {
  // First check if exact match in palette
  const definition = getColorDefinitionFromHex(hex, 5);
  if (definition?.semantic) {
    return definition.semantic;
  }

  const hsl = hexToHSL(hex);

  // Infer based on hue (0-360)
  const hue = hsl.h || 0;

  // Red tones (0°, 360°)
  if (hue < 30 || hue > 330) {
    return hsl.l < 30 ? "error-dark" : hsl.l > 70 ? "error-light" : "error";
  }

  // Orange/Amber tones (30-60°)
  if (hue >= 30 && hue < 60) {
    return hsl.l < 30 ? "warning-dark" : hsl.l > 70 ? "warning-light" : "warning";
  }

  // Yellow tones (60-90°)
  if (hue >= 60 && hue < 90) {
    return "highlight";
  }

  // Green tones (90-150°)
  if (hue >= 90 && hue < 150) {
    return hsl.l < 30 ? "success-dark" : hsl.l > 70 ? "success-light" : "success";
  }

  // Cyan/Blue tones (150-270°)
  if (hue >= 150 && hue < 270) {
    return "info";
  }

  // Purple/Magenta tones (270-330°)
  if (hue >= 270 && hue < 330) {
    return "premium";
  }

  return null;
}

/**
 * Get similar colors from palette
 * Useful for finding related colors
 *
 * @param hex - Reference color
 * @param limit - Maximum number of results (default: 5)
 * @param maxDistance - Maximum allowed distance (default: 20)
 * @returns Array of similar colors sorted by distance
 */
export const findSimilarColors = (
  hex: string,
  limit: number = 5,
  maxDistance: number = 20
): Array<{ color: ColorDefinition; distance: number }> => {
  const similar: Array<{ color: ColorDefinition; distance: number }> = [];

  for (const color of Object.values(COLOR_PALETTE)) {
    const distance = getColorDistance(hex, color.hex);
    if (distance <= maxDistance) {
      similar.push({ color, distance });
    }
  }

  // Sort by distance (closest first)
  similar.sort((a, b) => a.distance - b.distance);

  return similar.slice(0, limit);
}

/**
 * Get colors in same semantic category
 * Useful for theme or status consistency
 *
 * @param semantic - Semantic value (e.g., "error", "success")
 * @returns Array of colors with that semantic
 */
export const getColorsBySemantic = (semantic: string): ColorDefinition[] => {
  return Object.values(COLOR_PALETTE).filter((c) => c.semantic === semantic);
};

// ─────────────────────────────────────────────────────────────────────
// BATCH OPERATIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Extract and name multiple colors
 * Useful for processing color palettes
 *
 * @param hexColors - Array of hex colors
 * @returns Array of extracted colors with names and semantics
 */
export const extractAndNameColors = (hexColors: string[]): ExtractedColor[] => {
  return hexColors.map((hex) => {
    const definition = getColorDefinitionFromHex(hex, 20);

    return {
      hex: hex.toUpperCase(),
      name: definition?.name || getColorNameFromHex(hex, 30) || "Unknown",
      semantic: definition?.semantic || inferSemanticFromColor(hex) || undefined,
      confidence: definition
        ? 1 - getColorDistance(hex, definition.hex) / 100
        : 0.5,
    };
  });
}

/**
 * Extract dominant colors from a list (removes similar colors)
 * Useful for reducing color palette to unique colors
 *
 * @param hexColors - Array of hex colors
 * @param minDistance - Minimum distance between colors (default: 20)
 * @returns Array of unique/distinct colors
 */
export const extractDominantColors = ( hexColors: string[], minDistance: number = 20 ): string[] => {
  const dominant: string[] = [];

  for (const hex of hexColors) {
    // Check if similar color already exists
    const hasSimilar = dominant.some(
      (existing) => getColorDistance(hex, existing) < minDistance
    );

    if (!hasSimilar) {
      dominant.push(hex);
    }
  }

  return dominant;
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE COLOR EXTRACTION (Placeholder)
// ─────────────────────────────────────────────────────────────────────

/**
 * Extract colors from image (requires image data)
 * This is a placeholder - would need canvas API or image processing library
 * 
 * @param imageUrl - URL of image
 * @returns Promise<ExtractedColor[]>
 */
export const extractColorsFromImage = async ( imageUrl: string ): Promise<ExtractedColor[]> => {
  try {
    // This would require a library like color-thief or a server-side service
    // For now, return empty array as placeholder
    console.warn(
      "extractColorsFromImage: Implementation requires color-thief library"
    );
    return [];
  } 
  catch (error) {
    console.error("Failed to extract colors from image:", error);
    return [];
  }
}

/**
 * Extract colors from canvas element
 * Gets pixel data and extracts dominant colors
 *
 * @param canvas - Canvas element
 * @param sampleSize - Number of pixels to sample (default: 100)
 * @returns Array of hex colors found in canvas
 */
export const extractColorsFromCanvas = ( canvas: HTMLCanvasElement, sampleSize: number = 100 ): string[] => {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const colors: string[] = [];
    const step = Math.max(1, Math.floor(data.length / (sampleSize * 4)));

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const hex = `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();

      colors.push(hex);
    }

    // Return unique dominant colors
    return extractDominantColors(colors, 25);
  } 
  catch (error) {
    console.error("Failed to extract colors from canvas:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// PALLETE ANALYZER
// ─────────────────────────────────────────────────────────────────────

/**
 * Analyze color palette for accessibility
 * Checks contrast ratios and suggests improvements
 */
export const analyzePaletteAccessibility = (
  foregroundColors: string[],
  backgroundColor: string
): {
  colors: Array<{
    hex: string;
    name: string | null;
    contrastRatio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
  }>;
  summary: {
    totalColors: number;
    accessibleAA: number;
    accessibleAAA: number;
  };
} => {
  const { getContrast } = require("./colorServiceAdvanced");

  const colors = foregroundColors.map((hex) => {
    const contrastRatio = getContrast(hex, backgroundColor);
    const meetsAA = contrastRatio >= 4.5;
    const meetsAAA = contrastRatio >= 7;

    return {
      hex,
      name: getColorNameFromHex(hex),
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      meetsAA,
      meetsAAA,
    };
  });

  return {
    colors,
    summary: {
      totalColors: colors.length,
      accessibleAA: colors.filter((c) => c.meetsAA).length,
      accessibleAAA: colors.filter((c) => c.meetsAAA).length,
    },
  };
}
