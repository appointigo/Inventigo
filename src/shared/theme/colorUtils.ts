/**
 * Color Utility Functions
 * Shared utilities for color manipulation and contrast calculations
 * Extracted from components for reusability and performance
 */

import chroma from "chroma-js";

/**
 * WCAG Contrast Ratio Calculation
 * Proper implementation using W3C formula
 * Reference: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export const calculateRelativeLuminance = (hex: string): number => {
  const hex_clean = hex.replace("#", "");
  const r = parseInt(hex_clean.substring(0, 2), 16) / 255;
  const g = parseInt(hex_clean.substring(2, 4), 16) / 255;
  const b = parseInt(hex_clean.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const luminance = (channel: number): number => {
    if (channel <= 0.03928) {
      return channel / 12.92;
    }
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio between 1 and 21 (WCAG standard)
 * Higher ratio = better contrast
 *
 * @example
 * getContrastRatio("#FFFFFF", "#000000") // 21 (max contrast)
 * getContrastRatio("#FFFFFF", "#FFFF00") // 1.08 (poor contrast)
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const fgLuminance = calculateRelativeLuminance(foreground);
  const bgLuminance = calculateRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG accessibility standards
 * @param foreground - Text/foreground color
 * @param background - Background color
 * @param level - WCAG level: "AA" (4.5:1) or "AAA" (7:1)
 * @returns true if meets standard
 */
export const isAccessible = (
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA"
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const threshold = level === "AA" ? 4.5 : 7;
  return ratio >= threshold;
}

/**
 * Get the best contrasting text color (black or white) for a background
 * Uses proper WCAG luminance calculation
 *
 * @param backgroundColor - Hex color
 * @returns "#000000" for light backgrounds, "#FFFFFF" for dark backgrounds
 */
export const getContrastingTextColor = (backgroundColor: string): string => {
  const luminance = calculateRelativeLuminance(backgroundColor);
  // Threshold of 0.179 comes from WCAG guidelines
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Convert hex to RGBA for opacity effects
 * @param hex - Hex color code
 * @param alpha - Opacity (0-1)
 * @returns RGBA string
 *
 * @example
 * hexToRgba("#EF4444", 0.2) // "rgba(239, 68, 68, 0.2)"
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const hexClean = hex.replace("#", "");
  const r = parseInt(hexClean.substring(0, 2), 16);
  const g = parseInt(hexClean.substring(2, 4), 16);
  const b = parseInt(hexClean.substring(4, 6), 16);

  // Clamp alpha between 0 and 1
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

/**
 * Lighten color by mixing with white
 * Uses chroma-js for accurate color manipulation
 *
 * @param hex - Hex color
 * @param percent - Amount to lighten (0-100)
 * @returns Lightened hex color
 */
export const lightenColor = (hex: string, percent: number = 20): string => {
  try {
    const lightened = chroma(hex).luminance(
      calculateRelativeLuminance(hex) + percent / 100 * 0.5
    );
    return lightened.hex();
  } 
  catch (error) {
    console.error("lighten color: ", error);

    // Fallback to manual calculation if chroma fails
    const hexClean = hex.replace("#", "");
    const r = parseInt(hexClean.substring(0, 2), 16);
    const g = parseInt(hexClean.substring(2, 4), 16);
    const b = parseInt(hexClean.substring(4, 6), 16);

    const lighter = (channel: number) =>
      Math.round(channel + (255 - channel) * (percent / 100));

    const newR = lighter(r).toString(16).padStart(2, "0");
    const newG = lighter(g).toString(16).padStart(2, "0");
    const newB = lighter(b).toString(16).padStart(2, "0");

    return `#${newR}${newG}${newB}`.toUpperCase();
  }
}

/**
 * Darken color by mixing with black
 * Uses chroma-js for accurate color manipulation
 *
 * @param hex - Hex color
 * @param percent - Amount to darken (0-100)
 * @returns Darkened hex color
 */
export const darkenColor = (hex: string, percent: number = 20): string => {
  try {
    const darkened = chroma(hex).luminance(
      calculateRelativeLuminance(hex) - percent / 100 * 0.3
    );
    return darkened.hex();
  } 
  catch (error) {
    console.error("darken color: ", error);
    // Fallback to manual calculation if chroma fails
    const hexClean = hex.replace("#", "");
    const r = parseInt(hexClean.substring(0, 2), 16);
    const g = parseInt(hexClean.substring(2, 4), 16);
    const b = parseInt(hexClean.substring(4, 6), 16);

    const darker = (channel: number) =>
      Math.round(channel - channel * (percent / 100));

    const newR = darker(r).toString(16).padStart(2, "0");
    const newG = darker(g).toString(16).padStart(2, "0");
    const newB = darker(b).toString(16).padStart(2, "0");

    return `#${newR}${newG}${newB}`.toUpperCase();
  }
}

/**
 * Generate color variations (tints, shades, disabled)
 * Used for interactive states
 *
 * @param hex - Base hex color
 * @returns Object with base, tint, shade, light, dark, disabled colors
 */
export const generateColorVariations = (
  hex: string
): {
  base: string;
  tint: string;
  shade: string;
  light: string;
  dark: string;
  disabled: string;
} => {
  try {
    const color = chroma(hex);

    return {
      base: color.hex(),
      tint: color.luminance(Math.min(0.95, calculateRelativeLuminance(hex) + 0.2)).hex(),
      shade: color.luminance(Math.max(0.05, calculateRelativeLuminance(hex) - 0.2)).hex(),
      light: lightenColor(hex, 30),
      dark: darkenColor(hex, 30),
      disabled: chroma(hex).desaturate(1.5).hex(),
    };
  } 
  catch (error) {
    console.error("generate color variations: ", error);
    // Fallback if chroma fails
    return {
      base: hex,
      tint: lightenColor(hex, 20),
      shade: darkenColor(hex, 20),
      light: lightenColor(hex, 40),
      dark: darkenColor(hex, 40),
      disabled: hex, // Can't desaturate without chroma
    };
  }
}

/**
 * Get complementary color
 * Uses chroma-js for accurate HSL transformation
 */
export const getComplementaryColor = (hex: string): string => {
  try {
    const hsl = chroma(hex).hsl();
    const newHue = (hsl[0] + 180) % 360;
    return chroma.hsl(newHue, hsl[1], hsl[2]).hex();
  } 
  catch (error) {
    console.error("get complementary color: ", error);
    return hex; // Return original if fails
  }
}

/**
 * Get analogous colors (colors next to each other on color wheel)
 */
export const getAnalogousColors = ( hex: string, count: number = 2, rotation: number = 30 ): string[] => {
  try {
    const baseHsl = chroma(hex).hsl();
    const colors = [hex];
    
    for (let i = 1; i <= count; i++) {
      // Add rotation
      const hueAdd = (baseHsl[0] + rotation * i) % 360;
      colors.push(chroma.hsl(hueAdd, baseHsl[1], baseHsl[2]).hex());
      
      // Subtract rotation
      const hueSub = (baseHsl[0] - rotation * i + 360) % 360;
      colors.push(chroma.hsl(hueSub, baseHsl[1], baseHsl[2]).hex());
    }
    return colors;
  } 
  catch (error) {
    console.error("get analogous colors: ", error);
    return [hex];
  }
}

/**
 * Get triadic color scheme (3 colors evenly spaced on color wheel)
 */
export const getTriadicColors = (hex: string): string[] => {
  try {
    const hsl = chroma(hex).hsl();
    return [
      hex,
      chroma.hsl((hsl[0] + 120) % 360, hsl[1], hsl[2]).hex(),
      chroma.hsl((hsl[0] + 240) % 360, hsl[1], hsl[2]).hex(),
    ];
  } 
  catch (error) {
    console.error("get triadic colors: ", error);
    return [hex];
  }
}

/**
 * Get tetradic color scheme (4 colors - two complementary pairs)
 */
export const getTetradicColors = (hex: string): string[] => {
  try {
    const hsl = chroma(hex).hsl();
    return [
      hex,
      chroma.hsl((hsl[0] + 90) % 360, hsl[1], hsl[2]).hex(),
      chroma.hsl((hsl[0] + 180) % 360, hsl[1], hsl[2]).hex(),
      chroma.hsl((hsl[0] + 270) % 360, hsl[1], hsl[2]).hex(),
    ];
  } 
  catch (error) {
    console.error("get tetradic colors: ", error);
    return [hex];
  }
}

/**
 * Cache key generator for color operations
 * Useful for memoization
 */
export const getCacheKey = (operation: string, ...args: string[]): string => {
  return `${operation}:${args.join(":")}`;
};
